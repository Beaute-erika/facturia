import { NextRequest, NextResponse } from "next/server";
import { createServerClient, supabaseAdmin } from "@/lib/supabase-server";
import { generateDocumentNumber } from "@/lib/document-sequences";
import type { LigneDevis, BonLivraisonLigne } from "@/lib/database.types";

export async function POST(req: NextRequest) {
  try {
    const supabase = await createServerClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });

    const { bon_commande_id } = await req.json();
    if (!bon_commande_id) return NextResponse.json({ error: "bon_commande_id requis" }, { status: 400 });

    const { data: bc, error: bcErr } = await supabaseAdmin()
      .from("bons_de_commande")
      .select("*")
      .eq("id", bon_commande_id)
      .eq("user_id", user.id)
      .single();

    if (bcErr || !bc) return NextResponse.json({ error: "Bon de commande introuvable" }, { status: 404 });

    // Convert lignes: strip prices, add reference field
    const blLignes: BonLivraisonLigne[] = (bc.lignes as LigneDevis[]).map((l) => ({
      id:          l.id,
      description: l.description,
      quantite:    l.quantite,
      unite:       l.unite,
      reference:   "",
    }));

    const numero = await generateDocumentNumber(supabaseAdmin(), user.id, "bons_de_livraison");

    const { data: bl, error: blErr } = await supabaseAdmin()
      .from("bons_de_livraison")
      .insert({
        user_id:         user.id,
        bon_commande_id: bc.id,
        numero,
        client_nom:      bc.client_nom,
        client_email:    bc.client_email,
        objet:           bc.objet,
        statut:          "brouillon",
        lignes:          blLignes,
        date_emission:   new Date().toISOString().split("T")[0],
        notes:           bc.notes,
      })
      .select()
      .single();

    if (blErr || !bl) {
      console.error("[bon-commande-to-livraison] insert failed:", blErr?.message);
      return NextResponse.json({ error: "Impossible de créer le bon de livraison" }, { status: 500 });
    }

    // Mark BC as confirmed
    await supabaseAdmin()
      .from("bons_de_commande")
      .update({ statut: "confirme" })
      .eq("id", bon_commande_id);

    return NextResponse.json({ ok: true, bon_livraison_id: bl.id, numero: bl.numero });
  } catch (err) {
    console.error("[bon-commande-to-livraison]", err);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
