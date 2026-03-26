import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase-server";

type Params = { params: { id: string } };

export async function PATCH(req: NextRequest, { params }: Params) {
  try {
    const supabase = await createServerClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });

    const body = await req.json() as {
      numero?:               string;
      client_nom?:           string;
      client_email?:         string | null;
      objet?:                string;
      lignes?:               unknown[];
      taux_tva?:             number;
      montant_ht?:           number;
      montant_tva?:          number;
      montant_ttc?:          number;
      date_emission?:        string;
      date_livraison_prevue?: string | null;
      statut?:               "brouillon" | "envoye" | "confirme" | "annule";
      notes?:                string | null;
    };

    const update: Record<string, unknown> = {};
    if (body.numero               !== undefined) update.numero               = body.numero?.trim();
    if (body.client_nom           !== undefined) update.client_nom           = body.client_nom?.trim();
    if (body.client_email         !== undefined) update.client_email         = body.client_email?.trim() || null;
    if (body.objet                !== undefined) update.objet                = body.objet?.trim();
    if (body.lignes               !== undefined) update.lignes               = body.lignes as import("@/lib/database.types").LigneDevis[];
    if (body.taux_tva             !== undefined) update.taux_tva             = body.taux_tva;
    if (body.montant_ht           !== undefined) update.montant_ht           = body.montant_ht;
    if (body.montant_tva          !== undefined) update.montant_tva          = body.montant_tva;
    if (body.montant_ttc          !== undefined) update.montant_ttc          = body.montant_ttc;
    if (body.date_emission        !== undefined) update.date_emission        = body.date_emission;
    if (body.date_livraison_prevue !== undefined) update.date_livraison_prevue = body.date_livraison_prevue || null;
    if (body.statut               !== undefined) update.statut               = body.statut;
    if (body.notes                !== undefined) update.notes                = body.notes?.trim() || null;

    const { data, error } = await supabase
      .from("bons_de_commande")
      .update(update)
      .eq("id", params.id)
      .eq("user_id", user.id)
      .select()
      .single();

    if (error) throw error;
    if (!data) return NextResponse.json({ error: "Bon de commande introuvable" }, { status: 404 });
    return NextResponse.json({ bon_de_commande: data });
  } catch (err) {
    console.error("[bons-de-commande/PATCH]", err);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}

export async function DELETE(_req: NextRequest, { params }: Params) {
  try {
    const supabase = await createServerClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });

    const { error } = await supabase
      .from("bons_de_commande")
      .delete()
      .eq("id", params.id)
      .eq("user_id", user.id);

    if (error) throw error;
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[bons-de-commande/DELETE]", err);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
