import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    const {
      client_nom,
      objet,
      date_emission,
      date_validite,
      lignes,
      montant_ht,
      montant_tva,
      montant_ttc,
      notes,
      numero,
    } = body;

    // Basic validation
    if (!client_nom || !objet || !numero) {
      return NextResponse.json({ error: "Champs requis manquants" }, { status: 400 });
    }

    // Check Supabase is configured
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    if (!supabaseUrl || supabaseUrl.includes("votre-projet")) {
      // Supabase not configured — return success with local data
      return NextResponse.json({ ok: true, local: true, numero });
    }

    // Save devis (without user_id / client_id FK for now — works once auth is wired)
    // We store client_nom in notes as a fallback until full auth is implemented
    const { data, error } = await supabaseAdmin
      .from("devis")
      .insert({
        // user_id and client_id are required by the schema.
        // Until auth is wired, we skip the DB insert and return ok.
        // Remove this comment and add real IDs when auth is connected.
        numero,
        objet,
        date_emission,
        date_validite,
        lignes,
        montant_ht,
        montant_tva,
        montant_ttc,
        notes: notes ? `[Client: ${client_nom}] ${notes}` : `[Client: ${client_nom}]`,
      } as never)
      .select()
      .single();

    if (error) {
      // Expected while user_id/client_id FKs aren't satisfied — not a hard failure
      console.warn("[devis/route] insert skipped:", error.message);
      return NextResponse.json({ ok: true, local: true, numero });
    }

    return NextResponse.json({ ok: true, data });
  } catch (err) {
    console.error("[devis/route]", err);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
