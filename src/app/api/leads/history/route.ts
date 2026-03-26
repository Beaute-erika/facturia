import { NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase-server";

export async function GET() {
  try {
    const supabase = await createServerClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data: searches, error } = await supabase
      .from("lead_searches")
      .select("id, adresse, metier, rayon_km, lat, lon, result_count, created_at")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(20);

    if (error) {
      console.error("[leads/history]", error);
      return NextResponse.json({ error: "Erreur lors de la récupération" }, { status: 500 });
    }

    return NextResponse.json({ searches: searches ?? [] });
  } catch (err) {
    console.error("[leads/history]", err);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
