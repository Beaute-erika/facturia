import Stripe from "stripe";

// ─── Singleton ─────────────────────────────────────────────────────────────

let _stripe: Stripe | null = null;

export function getStripe(): Stripe {
  if (!_stripe) {
    const key = process.env.STRIPE_SECRET_KEY;
    if (!key) throw new Error("STRIPE_SECRET_KEY non configurée");
    _stripe = new Stripe(key, { apiVersion: "2026-03-25.dahlia" });
  }
  return _stripe;
}

// ─── Config guards ──────────────────────────────────────────────────────────

export function isStripeConfigured(): boolean {
  return !!(
    process.env.STRIPE_SECRET_KEY &&
    process.env.STRIPE_PRICE_PRO_MONTHLY &&
    process.env.STRIPE_PRICE_BUSINESS_MONTHLY
  );
}

/** Price IDs per plan — from env, validated at call time */
export function getPriceId(plan: "pro" | "business"): string {
  const id =
    plan === "pro"
      ? process.env.STRIPE_PRICE_PRO_MONTHLY
      : process.env.STRIPE_PRICE_BUSINESS_MONTHLY;
  if (!id) throw new Error(`STRIPE_PRICE_${plan.toUpperCase()}_MONTHLY non configuré`);
  return id;
}

/** Map a Stripe Price ID back to our plan key */
export function planFromPriceId(priceId: string): "pro" | "business" | null {
  if (priceId === process.env.STRIPE_PRICE_PRO_MONTHLY)      return "pro";
  if (priceId === process.env.STRIPE_PRICE_BUSINESS_MONTHLY) return "business";
  return null;
}

export const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
