import { NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase-server";

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
        _uuid: row.id,
      };
    });

    return NextResponse.json({ factures });
  } catch (err) {
    console.error("[factures/GET]", err);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
