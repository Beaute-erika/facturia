import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { getStripe, planFromPriceId } from "@/lib/stripe";
import type Stripe from "stripe";

/**
 * POST /api/billing/webhook
 *
 * Handles Stripe webhook events to keep our DB in sync with Stripe state.
 * Events handled:
 *   - checkout.session.completed          → save customer + subscription IDs, activate plan
 *   - customer.subscription.created       → (covered by checkout.session.completed in most cases)
 *   - customer.subscription.updated       → update plan, status, period_end
 *   - customer.subscription.deleted       → downgrade to starter, clear subscription data
 */
export async function POST(req: NextRequest) {
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!webhookSecret) {
    console.error("[billing/webhook] STRIPE_WEBHOOK_SECRET non configuré");
    return NextResponse.json({ error: "Webhook non configuré" }, { status: 500 });
  }

  const body      = await req.text();
  const signature = req.headers.get("stripe-signature");

  if (!signature) {
    return NextResponse.json({ error: "Signature manquante" }, { status: 400 });
  }

  let event: Stripe.Event;
  try {
    const stripe = getStripe();
    event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Signature invalide";
    console.error("[billing/webhook] Vérification signature échouée :", msg);
    return NextResponse.json({ error: msg }, { status: 400 });
  }

  // Use service role to bypass RLS for server-side updates
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );

  try {
    switch (event.type) {

      // ── Checkout completed — user paid and subscription is now active ──────
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        const userId  = session.metadata?.userId;
        const targetPlan = session.metadata?.targetPlan;

        if (!userId || !targetPlan) {
          console.error("[billing/webhook] checkout.session.completed — userId ou targetPlan manquant dans metadata");
          break;
        }

        // Retrieve the full subscription to get period_end
        if (session.subscription) {
          const stripe       = getStripe();
          const subscription = await stripe.subscriptions.retrieve(session.subscription as string) as Stripe.Subscription;

          await supabase
            .from("users")
            .update({
              plan:                    targetPlan,
              stripe_customer_id:      session.customer as string,
              stripe_sub_id:           subscription.id,
              subscription_status:     subscription.status,
              subscription_period_end: new Date(subscription.items.data[0]?.current_period_end * 1000).toISOString(),
            })
            .eq("id", userId);

          console.log(`[billing/webhook] checkout.session.completed — user ${userId} → plan ${targetPlan}`);
        }
        break;
      }

      // ── Subscription updated (plan change, renewal, payment failure…) ──────
      case "customer.subscription.updated": {
        const subscription = event.data.object as Stripe.Subscription;
        const userId       = subscription.metadata?.userId;

        if (!userId) {
          // Try to look up the user by stripe_customer_id
          const customerId = subscription.customer as string;
          const { data: user } = await supabase
            .from("users")
            .select("id")
            .eq("stripe_customer_id", customerId)
            .single();

          if (!user) {
            console.error("[billing/webhook] customer.subscription.updated — userId introuvable pour customer", customerId);
            break;
          }

          const priceId = subscription.items.data[0]?.price?.id ?? "";
          const plan    = planFromPriceId(priceId) ?? "starter";

          await supabase
            .from("users")
            .update({
              plan,
              stripe_sub_id:           subscription.id,
              subscription_status:     subscription.status,
              subscription_period_end: new Date(subscription.items.data[0]?.current_period_end * 1000).toISOString(),
            })
            .eq("id", user.id);

          console.log(`[billing/webhook] customer.subscription.updated — user ${user.id} → plan ${plan} (${subscription.status})`);
          break;
        }

        const priceId = subscription.items.data[0]?.price?.id ?? "";
        const plan    = planFromPriceId(priceId) ?? "starter";

        await supabase
          .from("users")
          .update({
            plan,
            stripe_sub_id:           subscription.id,
            subscription_status:     subscription.status,
            subscription_period_end: new Date(subscription.items.data[0]?.current_period_end * 1000).toISOString(),
          })
          .eq("id", userId);

        console.log(`[billing/webhook] customer.subscription.updated — user ${userId} → plan ${plan} (${subscription.status})`);
        break;
      }

      // ── Subscription deleted — downgrade to starter ───────────────────────
      case "customer.subscription.deleted": {
        const subscription = event.data.object as Stripe.Subscription;
        const userId       = subscription.metadata?.userId;
        const customerId   = subscription.customer as string;

        let targetId = userId;
        if (!targetId) {
          const { data: user } = await supabase
            .from("users")
            .select("id")
            .eq("stripe_customer_id", customerId)
            .single();
          targetId = user?.id;
        }

        if (!targetId) {
          console.error("[billing/webhook] customer.subscription.deleted — userId introuvable pour customer", customerId);
          break;
        }

        await supabase
          .from("users")
          .update({
            plan:                    "starter",
            stripe_sub_id:           null,
            subscription_status:     "canceled",
            subscription_period_end: new Date(subscription.items.data[0]?.current_period_end * 1000).toISOString(),
          })
          .eq("id", targetId);

        console.log(`[billing/webhook] customer.subscription.deleted — user ${targetId} → starter`);
        break;
      }

      // ── Invoice payment failed — mark subscription as past_due ────────────
      case "invoice.payment_failed": {
        const invoice    = event.data.object as Stripe.Invoice;
        const customerId = invoice.customer as string;

        const { data: user } = await supabase
          .from("users")
          .select("id, subscription_status")
          .eq("stripe_customer_id", customerId)
          .single();

        if (!user) {
          console.error("[billing/webhook] invoice.payment_failed — user introuvable pour customer", customerId);
          break;
        }

        // Only update if the subscription was active (avoid redundant writes)
        if (user.subscription_status !== "past_due") {
          await supabase
            .from("users")
            .update({ subscription_status: "past_due" })
            .eq("id", user.id);
        }

        console.warn(`[billing/webhook] invoice.payment_failed — user ${user.id} → past_due (tentative ${(invoice as Stripe.Invoice & { attempt_count?: number }).attempt_count ?? "?"})`);
        break;
      }

      // ── Invoice payment succeeded — restore active status if was past_due ─
      case "invoice.payment_succeeded": {
        const invoice    = event.data.object as Stripe.Invoice;
        const customerId = invoice.customer as string;

        // Only act on subscription invoices (not one-time)
        // Note: `subscription` exists at runtime but typing varies across Stripe API versions
        const invoiceSubscriptionId = (invoice as Stripe.Invoice & { subscription?: string | null }).subscription;
        if (!invoiceSubscriptionId) break;

        const { data: user } = await supabase
          .from("users")
          .select("id, subscription_status")
          .eq("stripe_customer_id", customerId)
          .single();

        if (!user) break;

        // Restore to active if coming from past_due
        if (user.subscription_status === "past_due") {
          await supabase
            .from("users")
            .update({ subscription_status: "active" })
            .eq("id", user.id);

          console.log(`[billing/webhook] invoice.payment_succeeded — user ${user.id} → active (récupération paiement)`);
        }
        break;
      }

      default:
        // Ignore all other events
        break;
    }

    return NextResponse.json({ received: true });
  } catch (err) {
    console.error("[billing/webhook] Erreur traitement event", event.type, err);
    return NextResponse.json({ error: "Erreur traitement webhook" }, { status: 500 });
  }
}
