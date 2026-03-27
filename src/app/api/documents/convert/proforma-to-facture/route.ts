import { NextRequest, NextResponse } from "next/server";
import { createServerClient, supabaseAdmin } from "@/lib/supabase-server";
import { generateDocumentNumber } from "@/lib/document-sequences";

export async function POST(req: NextRequest) {
  try {
    const supabase = await createServerClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });

    const { pro_forma_id } = await req.json();
    if (!pro_forma_id) return NextResponse.json({ error: "pro_forma_id requis" }, { status: 400 });

    const { data: pf, error: pfErr } = await supabaseAdmin()
      .from("factures_pro_forma")
      .select("*")
      .eq("id", pro_forma_id)
      .eq("user_id", user.id)
      .single();

    if (pfErr || !pf) return NextResponse.json({ error: "Pro forma introuvable" }, { status: 404 });

    const numero = await generateDocumentNumber(supabaseAdmin(), user.id, "factures");

    // Resolve or create client
    const { data: clientRow } = await supabaseAdmin()
      .from("clients")
      .select("id")
      .eq("user_id", user.id)
      .ilike("nom", pf.client_nom.trim())
      .maybeSingle();

    let clientId: string;
    if (clientRow) {
      clientId = clientRow.id;
    } else {
      const { data: created } = await supabaseAdmin()
        .from("clients")
        .insert({ user_id: user.id, nom: pf.client_nom, email: pf.client_email ?? null, type: "particulier" })
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
        user_id:      user.id,
        client_id:    clientId,
        pro_forma_id: pf.id,
        numero,
        objet:        pf.objet,
        statut:       "brouillon",
        date_emission: today,
        date_echeance: echeance.toISOString().split("T")[0],
        lignes:       pf.lignes ?? [],
        tva_rate:     pf.taux_tva,
        montant_ht:   pf.montant_ht,
        montant_tva:  pf.montant_tva,
        montant_ttc:  pf.montant_ttc,
        notes:        pf.notes,
        chorus_pro:   false,
        remise_percent: 0,
        acompte:      0,
      })
      .select()
      .single();

    if (factureErr || !facture) {
      console.error("[proforma-to-facture] insert failed:", factureErr?.message);
      return NextResponse.json({ error: "Impossible de créer la facture" }, { status: 500 });
    }

    // Mark pro forma as accepté
    await supabaseAdmin()
      .from("factures_pro_forma")
      .update({ statut: "accepte" })
      .eq("id", pro_forma_id);

    return NextResponse.json({ ok: true, facture_id: facture.id, numero: facture.numero });
  } catch (err) {
    console.error("[proforma-to-facture]", err);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
