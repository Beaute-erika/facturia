import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase-server";
import { planAtLeast, type PlanId } from "@/lib/plans";
import { getStripe, getPriceId, isStripeConfigured, APP_URL } from "@/lib/stripe";
import type Stripe from "stripe";

/**
 * POST /api/billing/upgrade
 * Body: { targetPlan: "pro" | "business" }
 *
 * Modes :
 *   - Stripe configuré → crée Checkout Session, retourne { checkoutUrl }
 *   - Stripe absent    → mise à jour directe (dev/demo), retourne { ok, newPlan }
 */
export async function POST(req: NextRequest) {
  try {
    const supabase = await createServerClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });

    const body = await req.json() as { targetPlan?: string };
    const targetPlan = body.targetPlan as PlanId | undefined;

    if (!targetPlan || !["pro", "business"].includes(targetPlan)) {
      return NextResponse.json({ error: "Plan cible invalide (pro ou business uniquement)" }, { status: 400 });
    }

    const { data: profile } = await supabase
      .from("users")
      .select("plan, stripe_customer_id, email")
      .eq("id", user.id)
      .single();

    const currentPlan = profile?.plan ?? "starter";

    if (planAtLeast(currentPlan, targetPlan)) {
      return NextResponse.json({
        error: "Vous êtes déjà sur ce plan ou un plan supérieur.",
      }, { status: 400 });
    }

    // ── Mode Stripe ───────────────────────────────────────────────────────────
    if (isStripeConfigured()) {
      const stripe = getStripe();
      const priceId = getPriceId(targetPlan as "pro" | "business");

      const sessionParams: Stripe.Checkout.SessionCreateParams = {
        mode:       "subscription",
        line_items: [{ price: priceId, quantity: 1 }],
        success_url: `${APP_URL}/settings?tab=subscription&payment=success`,
        cancel_url:  `${APP_URL}/settings?tab=subscription&payment=cancelled`,
        metadata: { userId: user.id, targetPlan },
        subscription_data: {
          metadata: { userId: user.id, targetPlan },
        },
        allow_promotion_codes: true,
        billing_address_collection: "required",
        locale: "fr",
      };

      // Réutilise le customer Stripe existant ou crée via l'email
      if (profile?.stripe_customer_id) {
        sessionParams.customer = profile.stripe_customer_id;
      } else {
        sessionParams.customer_email = user.email ?? undefined;
      }

      const session = await stripe.checkout.sessions.create(sessionParams);
      return NextResponse.json({ checkoutUrl: session.url });
    }

    // ── Mode démo / dev (Stripe non configuré) ────────────────────────────────
    console.warn("[billing/upgrade] STRIPE_SECRET_KEY absent — mise à jour manuelle du plan");

    const { error: updateErr } = await supabase
      .from("users")
      .update({ plan: targetPlan })
      .eq("id", user.id);

    if (updateErr) return NextResponse.json({ error: "Erreur mise à jour plan" }, { status: 500 });

    return NextResponse.json({ ok: true, newPlan: targetPlan });
  } catch (err) {
    console.error("[billing/upgrade]", err);
    const msg = err instanceof Error ? err.message : "Erreur serveur";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
