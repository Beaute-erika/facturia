import { NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase-server";
import { PLAN_LIMITS } from "@/lib/ai/plan-limits";

export async function GET() {
  try {
    const supabase = await createServerClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });

    const yearMonth = new Date().toISOString().slice(0, 7);

    const [profileRes, usageRes] = await Promise.all([
      supabase.from("users").select("plan").eq("id", user.id).single(),
      supabase.from("agent_usage").select("message_count").eq("user_id", user.id).eq("year_month", yearMonth).single(),
    ]);

    const plan  = profileRes.data?.plan ?? "starter";
    const used  = usageRes.data?.message_count ?? 0;
    const limit = PLAN_LIMITS[plan] ?? 30;

    return NextResponse.json({ used, limit, plan, yearMonth });
  } catch (err) {
    console.error("[agent/usage]", err);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
