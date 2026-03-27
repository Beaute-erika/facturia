import { NextRequest, NextResponse } from "next/server";
import { createServerClient, supabaseAdmin } from "@/lib/supabase-server";
import { generateDocumentNumber } from "@/lib/document-sequences";
import type { LigneDevis } from "@/lib/database.types";

export async function POST(req: NextRequest) {
  try {
    const supabase = await createServerClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });

    const { bon_livraison_id } = await req.json();
    if (!bon_livraison_id) return NextResponse.json({ error: "bon_livraison_id requis" }, { status: 400 });

    const { data: bl, error: blErr } = await supabaseAdmin()
      .from("bons_de_livraison")
      .select("*")
      .eq("id", bon_livraison_id)
      .eq("user_id", user.id)
      .single();

    if (blErr || !bl) return NextResponse.json({ error: "Bon de livraison introuvable" }, { status: 404 });

    // Try to get pricing from associated bon_de_commande
    let lignes: LigneDevis[] = [];
    let montant_ht = 0, montant_tva = 0, montant_ttc = 0, tva_rate = 20;

    if (bl.bon_commande_id) {
      const { data: bc } = await supabaseAdmin()
        .from("bons_de_commande")
        .select("lignes, montant_ht, montant_tva, montant_ttc, taux_tva")
        .eq("id", bl.bon_commande_id)
        .single();
      if (bc) {
        lignes = (bc.lignes as LigneDevis[]) ?? [];
        montant_ht  = bc.montant_ht  ?? 0;
        montant_tva = bc.montant_tva ?? 0;
        montant_ttc = bc.montant_ttc ?? 0;
        tva_rate    = bc.taux_tva    ?? 20;
      }
    }

    const numero = await generateDocumentNumber(supabaseAdmin(), user.id, "factures");

    // Find client_id by name
    const { data: clientRow } = await supabaseAdmin()
      .from("clients")
      .select("id")
      .eq("user_id", user.id)
      .ilike("nom", bl.client_nom.trim())
      .maybeSingle();

    let clientId: string;
    if (clientRow) {
      clientId = clientRow.id;
    } else {
      const { data: created } = await supabaseAdmin()
        .from("clients")
        .insert({ user_id: user.id, nom: bl.client_nom, email: bl.client_email ?? null, type: "particulier" })
        .select("id")
        .single();
      clientId = created!.id;
    }

    const today = new Date().toISOString().split("T")[0];
    const echeance = new Date();
    echeance.setDate(echeance.getDate() + 30);

    const { data: facture, error: factureErr } = await supabaseAdmin()
      .from("factures")
      .insert({
        user_id:          user.id,
        client_id:        clientId,
        bon_livraison_id: bl.id,
        numero,
        objet:            bl.objet,
        statut:           "brouillon",
        date_emission:    today,
        date_echeance:    echeance.toISOString().split("T")[0],
        lignes,
        tva_rate,
        montant_ht,
        montant_tva,
        montant_ttc,
        notes:            bl.notes,
        chorus_pro:       false,
        remise_percent:   0,
        acompte:          0,
      })
      .select()
      .single();

    if (factureErr || !facture) {
      console.error("[livraison-to-facture] insert failed:", factureErr?.message);
      return NextResponse.json({ error: "Impossible de créer la facture" }, { status: 500 });
    }

    // Mark BL as livré
    await supabaseAdmin()
      .from("bons_de_livraison")
      .update({ statut: "livre" })
      .eq("id", bon_livraison_id);

    return NextResponse.json({ ok: true, facture_id: facture.id, numero: facture.numero });
  } catch (err) {
    console.error("[livraison-to-facture]", err);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
