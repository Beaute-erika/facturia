import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase-server";

type Params = { params: { id: string } };

export async function PATCH(req: NextRequest, { params }: Params) {
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

    if (body.name !== undefined && !body.name.trim()) {
      return NextResponse.json({ error: "Le nom ne peut pas être vide" }, { status: 400 });
    }

    const update: Record<string, unknown> = {};
    if (body.name        !== undefined) update.name        = body.name.trim();
    if (body.description !== undefined) update.description = body.description?.trim() || null;
    if (body.price_ht    !== undefined) update.price_ht    = body.price_ht;
    if (body.category    !== undefined) update.category    = body.category?.trim() || null;

    const { data, error } = await supabase
      .from("services")
      .update(update)
      .eq("id", params.id)
      .eq("user_id", user.id) // RLS double-check
      .select()
      .single();

    if (error) throw error;
    if (!data)  return NextResponse.json({ error: "Service introuvable" }, { status: 404 });

    return NextResponse.json({ service: data });
  } catch (err) {
    console.error("[services/PATCH]", err);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}

export async function DELETE(_req: NextRequest, { params }: Params) {
  try {
    const supabase = await createServerClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });

    const { error } = await supabase
      .from("services")
      .delete()
      .eq("id", params.id)
      .eq("user_id", user.id);

    if (error) throw error;
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[services/DELETE]", err);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
