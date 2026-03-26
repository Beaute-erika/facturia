import { NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase-server";
import { getStripe, isStripeConfigured, APP_URL } from "@/lib/stripe";

/**
 * POST /api/billing/portal
 *
 * Creates a Stripe Customer Portal session for the authenticated user.
 * The user must already have a stripe_customer_id (i.e. have paid at least once).
 *
 * Returns: { portalUrl: string }
 */
export async function POST() {
  try {
    if (!isStripeConfigured()) {
      return NextResponse.json({ error: "Stripe non configuré" }, { status: 503 });
    }

    const supabase = await createServerClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });

    const { data: profile } = await supabase
      .from("users")
      .select("stripe_customer_id")
      .eq("id", user.id)
      .single();

    if (!profile?.stripe_customer_id) {
      return NextResponse.json(
        { error: "Aucun abonnement Stripe trouvé pour ce compte." },
        { status: 404 },
      );
    }

    const stripe  = getStripe();
    const session = await stripe.billingPortal.sessions.create({
      customer:   profile.stripe_customer_id,
      return_url: `${APP_URL}/settings?tab=subscription`,
    });

    return NextResponse.json({ portalUrl: session.url });
  } catch (err) {
    console.error("[billing/portal]", err);
    const msg = err instanceof Error ? err.message : "Erreur serveur";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
