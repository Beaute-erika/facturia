import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase-server";

export async function GET() {
  try {
    const supabase = await createServerClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });

    const { data, error } = await supabase
      .from("services")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });

    if (error) throw error;
    return NextResponse.json({ services: data ?? [] });
  } catch (err) {
    console.error("[services/GET]", err);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const supabase = await createServerClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });

    const body = await req.json() as {
      name?: string;
      description?: string | null;
      price_ht?: number;
      category?: string | null;
    };

    if (!body.name?.trim()) {
      return NextResponse.json({ error: "Le nom est requis" }, { status: 400 });
    }

    const { data, error } = await supabase
      .from("services")
      .insert({
        user_id:     user.id,
        name:        body.name.trim(),
        description: body.description?.trim() || null,
        price_ht:    typeof body.price_ht === "number" ? body.price_ht : 0,
        category:    body.category?.trim() || null,
      })
      .select()
      .single();

    if (error) throw error;
    return NextResponse.json({ service: data });
  } catch (err) {
    console.error("[services/POST]", err);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
