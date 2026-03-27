import { NextRequest, NextResponse } from "next/server";
import { createServerClient, supabaseAdmin } from "@/lib/supabase-server";
import { generateDocumentNumber } from "@/lib/document-sequences";

export async function POST(req: NextRequest) {
  try {
    const supabase = await createServerClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });

    const { devis_id } = await req.json();
    if (!devis_id) return NextResponse.json({ error: "devis_id requis" }, { status: 400 });

    // Fetch devis
    const { data: devis, error: devisErr } = await supabaseAdmin()
      .from("devis")
      .select("*")
      .eq("id", devis_id)
      .eq("user_id", user.id)
      .single();

    if (devisErr || !devis) return NextResponse.json({ error: "Devis introuvable" }, { status: 404 });

    // Generate facture number
    const numero = await generateDocumentNumber(supabaseAdmin(), user.id, "factures");

    const today = new Date().toISOString().split("T")[0];
    const echeance = new Date();
    echeance.setDate(echeance.getDate() + 30);
    const echeanceStr = echeance.toISOString().split("T")[0];

    // Create facture from devis
    const { data: facture, error: factureErr } = await supabaseAdmin()
      .from("factures")
      .insert({
        user_id:             user.id,
        client_id:           devis.client_id,
        devis_id:            devis.id,
        numero,
        objet:               devis.objet,
        statut:              "brouillon",
        date_emission:       today,
        date_echeance:       echeanceStr,
        lignes:              devis.lignes ?? [],
        tva_rate:            devis.tva_rate,
        montant_ht:          devis.montant_ht,
        montant_tva:         devis.montant_tva,
        montant_ttc:         devis.montant_ttc,
        notes:               devis.notes,
        conditions_paiement: devis.conditions_paiement,
        remise_percent:      devis.remise_percent,
        acompte:             devis.acompte,
        chorus_pro:          devis.chorus_pro,
      })
      .select()
      .single();

    if (factureErr || !facture) {
      console.error("[devis-to-facture] facture insert failed:", factureErr?.message);
      return NextResponse.json({ error: "Impossible de créer la facture" }, { status: 500 });
    }

    // Update devis: mark as accepté and store facture_id
    await supabaseAdmin()
      .from("devis")
      .update({ statut: "accepte", facture_id: facture.id })
      .eq("id", devis_id);

    return NextResponse.json({ ok: true, facture_id: facture.id, numero: facture.numero });
  } catch (err) {
    console.error("[devis-to-facture]", err);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
