import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase-server";

type Params = { params: { id: string } };

export async function PATCH(req: NextRequest, { params }: Params) {
  try {
    const supabase = await createServerClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });

    const body = await req.json() as {
      numero?:         string;
      client_nom?:     string;
      client_email?:   string | null;
      objet?:          string;
      lignes?:         unknown[];
      date_emission?:  string;
      date_livraison?: string | null;
      statut?:         "brouillon" | "envoye" | "livre" | "annule";
      notes?:          string | null;
    };

    const update: Record<string, unknown> = {};
    if (body.numero         !== undefined) update.numero         = body.numero?.trim();
    if (body.client_nom     !== undefined) update.client_nom     = body.client_nom?.trim();
    if (body.client_email   !== undefined) update.client_email   = body.client_email?.trim() || null;
    if (body.objet          !== undefined) update.objet          = body.objet?.trim();
    if (body.lignes         !== undefined) update.lignes         = body.lignes as import("@/lib/database.types").BonLivraisonLigne[];
    if (body.date_emission  !== undefined) update.date_emission  = body.date_emission;
    if (body.date_livraison !== undefined) update.date_livraison = body.date_livraison || null;
    if (body.statut         !== undefined) update.statut         = body.statut;
    if (body.notes          !== undefined) update.notes          = body.notes?.trim() || null;

    const { data, error } = await supabase
      .from("bons_de_livraison")
      .update(update)
      .eq("id", params.id)
      .eq("user_id", user.id)
      .select()
      .single();

    if (error) throw error;
    if (!data) return NextResponse.json({ error: "Bon de livraison introuvable" }, { status: 404 });
    return NextResponse.json({ bon_de_livraison: data });
  } catch (err) {
    console.error("[bons-de-livraison/PATCH]", err);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}

export async function DELETE(_req: NextRequest, { params }: Params) {
  try {
    const supabase = await createServerClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });

    const { error } = await supabase
      .from("bons_de_livraison")
      .delete()
      .eq("id", params.id)
      .eq("user_id", user.id);

    if (error) throw error;
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[bons-de-livraison/DELETE]", err);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
