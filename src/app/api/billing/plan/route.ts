import { NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase-server";
import { getAiLimit } from "@/lib/plans";

export async function GET() {
  try {
    const supabase = await createServerClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });

    const yearMonth = new Date().toISOString().slice(0, 7);

    const [profileRes, usageRes] = await Promise.all([
      supabase
        .from("users")
        .select("plan, stripe_customer_id, stripe_sub_id, subscription_status, subscription_period_end")
        .eq("id", user.id)
        .single(),
      supabase
        .from("agent_usage")
        .select("message_count")
        .eq("user_id", user.id)
        .eq("year_month", yearMonth)
        .single(),
    ]);

    const plan    = profileRes.data?.plan ?? "starter";
    const aiUsed  = usageRes.data?.message_count ?? 0;
    const aiLimit = getAiLimit(plan);

    return NextResponse.json({
      plan,
      aiUsed,
      aiLimit,
      yearMonth,
      hasStripeSubscription:  !!profileRes.data?.stripe_sub_id,
      stripeCustomerId:       profileRes.data?.stripe_customer_id ?? null,
      subscriptionStatus:     profileRes.data?.subscription_status ?? null,
      subscriptionPeriodEnd:  profileRes.data?.subscription_period_end ?? null,
    });
  } catch (err) {
    console.error("[billing/plan]", err);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
