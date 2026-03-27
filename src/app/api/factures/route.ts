import { NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase-server";
import { generateDocumentNumber } from "@/lib/document-sequences";

const STATUT_MAP: Record<string, string> = {
  brouillon: "brouillon",
  envoyee: "envoyée",
  payee: "payée",
  en_retard: "en retard",
  annulee: "brouillon",
};

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("fr-FR", { day: "numeric", month: "short", year: "numeric" });
}

function formatEur(n: number) {
  return `${Math.round(n).toLocaleString("fr-FR")} €`;
}

export async function POST(req: Request) {
  try {
    const supabase = await createServerClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });

    const body = await req.json();
    const {
      client_nom, client_email, client_id, client_type,
      objet, date_emission, date_echeance, lignes, notes, numero,
      conditions_paiement,
      chorus_pro,
      remise_percent: remisePercentRaw,
      acompte: acompteRaw,
    } = body;

    // Calcul côté serveur
    const remisePercent = Math.min(100, Math.max(0, Number(remisePercentRaw ?? 0)));
    const acompte = Math.max(0, Number(acompteRaw ?? 0));
    const htBrut = (lignes ?? []).reduce(
      (s: number, l: { quantite: number; prix_unitaire: number }) =>
        s + Number(l.quantite) * Number(l.prix_unitaire),
      0,
    );
    const remise = htBrut * (remisePercent / 100);
    const htNet  = htBrut - remise;
    const df     = 1 - remisePercent / 100;
    const montant_tva = (lignes ?? []).reduce(
      (s: number, l: { quantite: number; prix_unitaire: number; tva: number }) =>
        s + Number(l.quantite) * Number(l.prix_unitaire) * df * (Number(l.tva) / 100),
      0,
    );
    const montant_ht  = htNet;
    const montant_ttc = htNet + montant_tva;

    const resolvedNumero = (numero as string | undefined)?.trim() || await generateDocumentNumber(supabase, user.id, "factures");

    if (!client_nom || !objet) {
      return NextResponse.json({ error: "Champs requis manquants (client_nom, objet)" }, { status: 400 });
    }

    // Résoudre client_id : utiliser celui fourni, sinon chercher/créer
    let resolvedClientId: string = client_id ?? null;

    if (!resolvedClientId) {
      // Chercher un client existant par nom
      const { data: existing } = await supabase
        .from("clients")
        .select("id")
        .eq("user_id", user.id)
        .ilike("nom", client_nom.trim())
        .maybeSingle();

      if (existing) {
        resolvedClientId = existing.id;
      } else {
        // Créer le client à la volée
        const { data: created, error: clientErr } = await supabase
          .from("clients")
          .insert({
            user_id: user.id,
            nom: client_nom.trim(),
            email: client_email ?? null,
            type: (client_type === "professionnel" ? "professionnel" : "particulier") as "particulier" | "professionnel",
          })
          .select("id")
          .single();
        if (clientErr) throw clientErr;
        resolvedClientId = created.id;
      }
    }

    const tvaRate = lignes?.length
      ? lignes.reduce((sum: number, l: { tva: number; total_ht: number }) => sum + l.tva * l.total_ht, 0) / (htNet || 1)
      : 10;

    const { data, error } = await supabase
      .from("factures")
      .insert({
        user_id: user.id,
        client_id: resolvedClientId,
        numero: resolvedNumero,
        objet: objet.trim(),
        date_emission: date_emission ?? new Date().toISOString().split("T")[0],
        date_echeance: date_echeance ?? null,
        lignes: lignes ?? [],
        tva_rate: Math.round(tvaRate * 100) / 100,
        montant_ht,
        montant_tva,
        montant_ttc,
        notes: notes ?? null,
        conditions_paiement: conditions_paiement ?? null,
        chorus_pro: chorus_pro === true,
        remise_percent: remisePercent,
        acompte,
        statut: "brouillon",
      })
      .select("*, clients(nom, prenom, raison_sociale)")
      .single();

    if (error) throw error;

    const c = data.clients as { nom: string; prenom: string | null; raison_sociale: string | null } | null;
    const clientLabel = c ? (c.prenom ? `${c.prenom} ${c.nom}` : c.raison_sociale || c.nom) : client_nom;

    return NextResponse.json({
      facture: {
        id: data.numero,
        _uuid: data.id,
        client: clientLabel,
        objet: data.objet,
        montant: formatEur(data.montant_ht),
        tva: formatEur(data.montant_tva),
        total: formatEur(data.montant_ttc),
        date: formatDate(data.date_emission),
        echeance: formatDate(data.date_echeance),
        status: "brouillon",
        chorus: chorus_pro === true,
        chorus_status: null,
        chorus_retry_count: 0,
      },
    }, { status: 201 });
  } catch (err) {
    console.error("[factures/POST]", err);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}

export async function GET() {
  try {
    const supabase = await createServerClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });

    const { data, error } = await supabase
      .from("factures")
      .select("*, clients(nom, prenom, raison_sociale)")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });

    if (error) throw error;

    const factures = (data ?? []).map((row) => {
      const c = row.clients as { nom: string; prenom: string | null; raison_sociale: string | null } | null;
      const client = c ? (c.prenom ? `${c.prenom} ${c.nom}` : c.raison_sociale || c.nom) : "—";
      const ht = row.montant_ht ?? 0;
      const tva = row.montant_tva ?? 0;
      const ttc = row.montant_ttc ?? 0;
      return {
        id: row.numero,
        client,
        objet: row.objet,
        montant: formatEur(ht),
        tva: formatEur(tva),
        total: formatEur(ttc),
        date: formatDate(row.date_emission),
        echeance: formatDate(row.date_echeance),
        status: STATUT_MAP[row.statut] ?? "brouillon",
        chorus: row.chorus_pro ?? false,
        chorus_status: (row as unknown as { chorus_status?: string | null }).chorus_status ?? null,
        chorus_last_error: (row as unknown as { chorus_last_error?: string | null }).chorus_last_error ?? null,
        chorus_retry_count: (row as unknown as { chorus_retry_count?: number }).chorus_retry_count ?? 0,
        _uuid: row.id,
      };
    });

    return NextResponse.json({ factures });
  } catch (err) {
    console.error("[factures/GET]", err);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
