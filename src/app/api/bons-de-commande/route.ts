import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase-server";

export async function GET() {
  try {
    const supabase = await createServerClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });

    const { data, error } = await supabase
      .from("bons_de_commande")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });

    if (error) throw error;
    return NextResponse.json({ bons_de_commande: data ?? [] });
  } catch (err) {
    console.error("[bons-de-commande/GET]", err);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
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

    if (!body.client_nom?.trim())
      return NextResponse.json({ error: "Le nom du client est requis" }, { status: 400 });
    if (!body.objet?.trim())
      return NextResponse.json({ error: "L'objet est requis" }, { status: 400 });

    const today = new Date().toISOString().split("T")[0];

    const { data, error } = await supabase
      .from("bons_de_commande")
      .insert({
        user_id:               user.id,
        numero:                body.numero?.trim() || `BC-${Date.now()}`,
        client_nom:            body.client_nom.trim(),
        client_email:          body.client_email?.trim() || null,
        objet:                 body.objet.trim(),
        lignes:                (body.lignes ?? []) as import("@/lib/database.types").LigneDevis[],
        taux_tva:              body.taux_tva ?? 20,
        montant_ht:            body.montant_ht ?? 0,
        montant_tva:           body.montant_tva ?? 0,
        montant_ttc:           body.montant_ttc ?? 0,
        date_emission:         body.date_emission ?? today,
        date_livraison_prevue: body.date_livraison_prevue ?? null,
        statut:                body.statut ?? "brouillon",
        notes:                 body.notes?.trim() || null,
      })
      .select()
      .single();

    if (error) throw error;
    return NextResponse.json({ bon_de_commande: data });
  } catch (err) {
    console.error("[bons-de-commande/POST]", err);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
