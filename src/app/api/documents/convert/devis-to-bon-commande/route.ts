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

    // Fetch devis with client info
    const { data: devis, error: devisErr } = await supabaseAdmin()
      .from("devis")
      .select("*, clients(nom, prenom, raison_sociale, email)")
      .eq("id", devis_id)
      .eq("user_id", user.id)
      .single();

    if (devisErr || !devis) return NextResponse.json({ error: "Devis introuvable" }, { status: 404 });

    const c = devis.clients as { nom: string; prenom: string | null; raison_sociale: string | null; email: string | null } | null;
    const clientNom = c ? (c.prenom ? `${c.prenom} ${c.nom}` : c.raison_sociale || c.nom) : "Client";

    const numero = await generateDocumentNumber(supabaseAdmin(), user.id, "bons_de_commande");

    const { data: bc, error: bcErr } = await supabaseAdmin()
      .from("bons_de_commande")
      .insert({
        user_id:       user.id,
        devis_id:      devis.id,
        numero,
        client_nom:    clientNom,
        client_email:  c?.email ?? null,
        objet:         devis.objet,
        statut:        "brouillon",
        lignes:        devis.lignes ?? [],
        taux_tva:      devis.tva_rate,
        montant_ht:    devis.montant_ht,
        montant_tva:   devis.montant_tva,
        montant_ttc:   devis.montant_ttc,
        date_emission: new Date().toISOString().split("T")[0],
        notes:         devis.notes,
      })
      .select()
      .single();

    if (bcErr || !bc) {
      console.error("[devis-to-bon-commande] insert failed:", bcErr?.message);
      return NextResponse.json({ error: "Impossible de créer le bon de commande" }, { status: 500 });
    }

    // Update devis
    await supabaseAdmin()
      .from("devis")
      .update({ statut: "accepte", bon_commande_id: bc.id })
      .eq("id", devis_id);

    return NextResponse.json({ ok: true, bon_commande_id: bc.id, numero: bc.numero });
  } catch (err) {
    console.error("[devis-to-bon-commande]", err);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
