import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase-server";

export async function GET() {
  try {
    const supabase = await createServerClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });

    const { data, error } = await supabase
      .from("bons_de_livraison")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });

    if (error) throw error;
    return NextResponse.json({ bons_de_livraison: data ?? [] });
  } catch (err) {
    console.error("[bons-de-livraison/GET]", err);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const supabase = await createServerClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });

    const body = await req.json() as {
      numero?:          string;
      client_nom?:      string;
      client_email?:    string | null;
      objet?:           string;
      lignes?:          unknown[];
      date_emission?:   string;
      date_livraison?:  string | null;
      statut?:          "brouillon" | "envoye" | "livre" | "annule";
      notes?:           string | null;
    };

    if (!body.client_nom?.trim())
      return NextResponse.json({ error: "Le nom du client est requis" }, { status: 400 });
    if (!body.objet?.trim())
      return NextResponse.json({ error: "L'objet est requis" }, { status: 400 });

    const today = new Date().toISOString().split("T")[0];

    const { data, error } = await supabase
      .from("bons_de_livraison")
      .insert({
        user_id:         user.id,
        numero:          body.numero?.trim() || `BL-${Date.now()}`,
        client_nom:      body.client_nom.trim(),
        client_email:    body.client_email?.trim() || null,
        objet:           body.objet.trim(),
        lignes:          (body.lignes ?? []) as import("@/lib/database.types").BonLivraisonLigne[],
        date_emission:   body.date_emission ?? today,
        date_livraison:  body.date_livraison ?? null,
        statut:          body.statut ?? "brouillon",
        notes:           body.notes?.trim() || null,
      })
      .select()
      .single();

    if (error) throw error;
    return NextResponse.json({ bon_de_livraison: data });
  } catch (err) {
    console.error("[bons-de-livraison/POST]", err);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
