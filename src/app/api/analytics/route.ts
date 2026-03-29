import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase-server";
import type {
  Period, MonthData, ClientStat, TypeBreakdown, FunnelStep, AnalyticsResponse,
} from "@/lib/analytics-types";

// ─── Helpers ─────────────────────────────────────────────────────────────────

const MONTHS = [
  { full: "Janvier",   short: "Jan" },
  { full: "Février",   short: "Fév" },
  { full: "Mars",      short: "Mar" },
  { full: "Avril",     short: "Avr" },
  { full: "Mai",       short: "Mai" },
  { full: "Juin",      short: "Jun" },
  { full: "Juillet",   short: "Jul" },
  { full: "Août",      short: "Aoû" },
  { full: "Septembre", short: "Sep" },
  { full: "Octobre",   short: "Oct" },
  { full: "Novembre",  short: "Nov" },
  { full: "Décembre",  short: "Déc" },
];

function toDateStr(d: Date): string {
  return d.toISOString().split("T")[0];
}

/** Liste des {year, month} entre start et end (inclus, ordonnée chronologiquement). */
function getMonthRange(start: Date, end: Date): { year: number; month: number }[] {
  const result: { year: number; month: number }[] = [];
  const cur = new Date(start.getFullYear(), start.getMonth(), 1);
  while (cur <= end) {
    result.push({ year: cur.getFullYear(), month: cur.getMonth() });
    cur.setMonth(cur.getMonth() + 1);
  }
  return result;
}

/**
 * Compare une date ISO ("YYYY-MM-DD" ou "YYYY-MM-DDTHH:MM:SS…") à un year/month.
 * Pas de conversion timezone — on compare la partie date directement.
 */
function matchMonth(
  dateStr: string | null | undefined,
  year: number,
  month: number, // 0-indexed
): boolean {
  if (!dateStr) return false;
  const parts = dateStr.split("T")[0].split("-");
  return +parts[0] === year && +parts[1] - 1 === month;
}

// ─── Route ───────────────────────────────────────────────────────────────────

export async function GET(req: NextRequest) {
  try {
    const supabase = await createServerClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });

    const period = (req.nextUrl.searchParams.get("period") ?? "trimestre") as Period;
    const now    = new Date();
    const curYear  = now.getFullYear();
    const curMonth = now.getMonth(); // 0-indexed

    // Période → date de début
    let startDate: Date;
    switch (period) {
      case "mois":      startDate = new Date(curYear, curMonth, 1);     break;
      case "trimestre": startDate = new Date(curYear, curMonth - 2, 1); break;
      case "semestre":  startDate = new Date(curYear, curMonth - 5, 1); break;
      case "année":     startDate = new Date(curYear, 0, 1);            break;
      default:          startDate = new Date(curYear, curMonth - 2, 1);
    }
    const endDate  = now;
    const startStr = toDateStr(startDate);
    const endStr   = toDateStr(endDate);

    // Dates N-1 (même fenêtre, un an plus tôt)
    const startN1 = new Date(startDate); startN1.setFullYear(startN1.getFullYear() - 1);
    const endN1   = new Date(endDate);   endN1.setFullYear(endN1.getFullYear() - 1);
    const ytdStartStr = `${curYear}-01-01`;

    // ── Requêtes parallèles ─────────────────────────────────────────────────
    const [
      fEmises,
      fPayees,
      fPayeesN1,
      dPeriod,
      dAll,
      fAllPaid,
      clData,
      fYtd,
    ] = await Promise.all([

      // 1. Factures émises dans la période (CA facturé)
      supabase.from("factures")
        .select("id,client_id,montant_ttc,statut,date_emission,date_paiement")
        .eq("user_id", user.id)
        .in("statut", ["envoyee", "payee", "en_retard"])
        .gte("date_emission", startStr)
        .lte("date_emission", endStr),

      // 2. Factures payées dans la période (CA encaissé)
      supabase.from("factures")
        .select("id,client_id,montant_ttc,date_emission,date_paiement")
        .eq("user_id", user.id)
        .eq("statut", "payee")
        .not("date_paiement", "is", null)
        .gte("date_paiement", startStr)
        .lte("date_paiement", endStr),

      // 3. Factures payées N-1 (pour comparaison)
      supabase.from("factures")
        .select("montant_ttc,date_paiement")
        .eq("user_id", user.id)
        .eq("statut", "payee")
        .not("date_paiement", "is", null)
        .gte("date_paiement", toDateStr(startN1))
        .lte("date_paiement", toDateStr(endN1)),

      // 4. Devis dans la période
      supabase.from("devis")
        .select("id,client_id,montant_ttc,statut,created_at")
        .eq("user_id", user.id)
        .gte("created_at", startDate.toISOString())
        .lte("created_at", endDate.toISOString()),

      // 5. Tous les devis (statut breakdown)
      supabase.from("devis")
        .select("statut,montant_ttc")
        .eq("user_id", user.id),

      // 6. Toutes les factures payées (top clients, all-time)
      supabase.from("factures")
        .select("client_id,montant_ttc")
        .eq("user_id", user.id)
        .eq("statut", "payee"),

      // 7. Clients (pour type et nom)
      supabase.from("clients")
        .select("id,type,nom,prenom,raison_sociale")
        .eq("user_id", user.id),

      // 8. CA YTD (pour objectif annuel)
      supabase.from("factures")
        .select("montant_ttc")
        .eq("user_id", user.id)
        .eq("statut", "payee")
        .not("date_paiement", "is", null)
        .gte("date_paiement", ytdStartStr)
        .lte("date_paiement", endStr),
    ]);

    const facturesEmises   = fEmises.data   ?? [];
    const facturesPayees   = fPayees.data   ?? [];
    const facturesPayeesN1 = fPayeesN1.data ?? [];
    const devisPeriod      = dPeriod.data   ?? [];
    const allDevis         = dAll.data      ?? [];
    const allPaidFact      = fAllPaid.data  ?? [];
    const clients          = clData.data    ?? [];

    // ── Helpers client ──────────────────────────────────────────────────────
    const clientMap = new Map(clients.map(c => [c.id, c]));

    const clientName = (id: string): string => {
      const c = clientMap.get(id);
      if (!c) return "Client inconnu";
      return c.raison_sociale
        || [c.prenom, c.nom].filter(Boolean).join(" ")
        || "—";
    };

    const clientType = (id: string): "Particulier" | "Professionnel" | "Public" => {
      const raw = (clientMap.get(id)?.type ?? "") as string;
      const t = raw.charAt(0).toUpperCase() + raw.slice(1).toLowerCase();
      if (t === "Professionnel" || t === "Public") return t as "Professionnel" | "Public";
      return "Particulier";
    };

    // ── Données mensuelles ──────────────────────────────────────────────────
    const monthRange = getMonthRange(startDate, endDate);

    const monthly: MonthData[] = monthRange.map(({ year, month }) => ({
      month:      MONTHS[month].full,
      shortMonth: MONTHS[month].short,
      ca: facturesPayees
        .filter(f => matchMonth(f.date_paiement, year, month))
        .reduce((s, f) => s + (f.montant_ttc ?? 0), 0),
      facture: facturesEmises
        .filter(f => matchMonth(f.date_emission, year, month))
        .reduce((s, f) => s + (f.montant_ttc ?? 0), 0),
      devis: devisPeriod
        .filter(d => matchMonth(d.created_at, year, month))
        .reduce((s, d) => s + (d.montant_ttc ?? 0), 0),
      nClients: new Set(
        facturesPayees
          .filter(f => matchMonth(f.date_paiement, year, month))
          .map(f => f.client_id)
      ).size,
      nChantiers: 0,
      caN1: facturesPayeesN1
        // N-1 dates : on compare year-1 mais même month
        .filter(f => matchMonth(f.date_paiement, year - 1, month))
        .reduce((s, f) => s + (f.montant_ttc ?? 0), 0),
    }));

    // ── KPIs globaux ────────────────────────────────────────────────────────
    const caEncaisse   = facturesPayees.reduce((s, f)   => s + (f.montant_ttc ?? 0), 0);
    const caFacture    = facturesEmises.reduce((s, f)   => s + (f.montant_ttc ?? 0), 0);
    const caEncaisseN1 = facturesPayeesN1.reduce((s, f) => s + (f.montant_ttc ?? 0), 0);
    const ytdCA        = (fYtd.data ?? []).reduce((s, f) => s + (f.montant_ttc ?? 0), 0);

    // Délai moyen paiement (jours entre date_emission et date_paiement)
    const withDelay = facturesPayees.filter(f => f.date_emission && f.date_paiement);
    const delaiMoyenPaiement = withDelay.length > 0
      ? Math.round(
          withDelay.reduce((s, f) => {
            const days =
              (new Date(f.date_paiement!).getTime() - new Date(f.date_emission).getTime())
              / 86_400_000;
            return s + Math.max(0, days);
          }, 0) / withDelay.length,
        )
      : 0;

    // Taux de conversion devis
    const devisEnvoyes  = devisPeriod.filter(d => d.statut !== "brouillon");
    const devisAcceptes = devisPeriod.filter(d => d.statut === "accepte");
    const tauxConversion = devisEnvoyes.length > 0
      ? Math.round((devisAcceptes.length / devisEnvoyes.length) * 100)
      : 0;

    // Paniers moyens
    const panierMoyenDevis = devisPeriod.length > 0
      ? Math.round(devisPeriod.reduce((s, d) => s + (d.montant_ttc ?? 0), 0) / devisPeriod.length)
      : 0;
    const panierMoyenFacture = facturesEmises.length > 0
      ? Math.round(facturesEmises.reduce((s, f) => s + (f.montant_ttc ?? 0), 0) / facturesEmises.length)
      : 0;

    const clientsActifs = new Set(facturesPayees.map(f => f.client_id)).size;

    // ── Top clients (all-time, toutes factures payées) ──────────────────────
    const caByClient = new Map<string, { ca: number; count: number }>();
    for (const f of allPaidFact) {
      const cur = caByClient.get(f.client_id) ?? { ca: 0, count: 0 };
      caByClient.set(f.client_id, { ca: cur.ca + (f.montant_ttc ?? 0), count: cur.count + 1 });
    }
    const topClients: ClientStat[] = Array.from(caByClient.entries())
      .sort((a, b) => b[1].ca - a[1].ca)
      .slice(0, 5)
      .map(([id, { ca, count }]) => ({
        name:     clientName(id),
        ca:       Math.round(ca),
        factures: count,
        type:     clientType(id),
      }));

    // ── CA par type client (période courante) ────────────────────────────────
    const byType: Record<"Particulier" | "Professionnel" | "Public", number> = {
      Particulier: 0, Professionnel: 0, Public: 0,
    };
    for (const f of facturesPayees) byType[clientType(f.client_id)] += f.montant_ttc ?? 0;

    const typeBreakdown: TypeBreakdown[] = [
      { name: "Public",         value: Math.round(byType.Public),         color: "#00c97a" },
      { name: "Professionnel",  value: Math.round(byType.Professionnel),  color: "#3b82f6" },
      { name: "Particulier",    value: Math.round(byType.Particulier),    color: "#f59e0b" },
    ].filter(t => t.value > 0);
    if (!typeBreakdown.length) typeBreakdown.push({ name: "Aucune donnée", value: 1, color: "#8899aa" });

    // ── Devis par statut — montants TTC (all-time) ──────────────────────────
    const byStatut = { brouillon: 0, envoye: 0, accepte: 0, refuse: 0, expire: 0 };
    for (const d of allDevis) {
      if (d.statut in byStatut) byStatut[d.statut as keyof typeof byStatut] += d.montant_ttc ?? 0;
    }
    const devisStatut = [
      { name: "Brouillons", value: Math.round(byStatut.brouillon), color: "#8899aa" },
      { name: "Envoyés",    value: Math.round(byStatut.envoye),    color: "#3b82f6" },
      { name: "Acceptés",   value: Math.round(byStatut.accepte),   color: "#00c97a" },
      { name: "Refusés",    value: Math.round(byStatut.refuse),    color: "#ef4444" },
      { name: "Expirés",    value: Math.round(byStatut.expire),    color: "#f59e0b" },
    ].filter(d => d.value > 0);
    if (!devisStatut.length) devisStatut.push({ name: "Aucun devis", value: 1, color: "#8899aa" });

    // ── Entonnoir devis (période courante) ───────────────────────────────────
    const fTotal   = devisPeriod.length;
    const safe     = (n: number) => fTotal > 0 ? Math.min(100, Math.round((n / fTotal) * 100)) : 0;
    const funnel: FunnelStep[] = [
      { label: "Devis créés",    value: fTotal,                   pct: 100,                      color: "#8899aa" },
      { label: "Devis envoyés",  value: devisEnvoyes.length,      pct: safe(devisEnvoyes.length), color: "#3b82f6" },
      { label: "Devis acceptés", value: devisAcceptes.length,     pct: safe(devisAcceptes.length), color: "#f59e0b" },
      { label: "Facturés",       value: facturesEmises.length,    pct: safe(facturesEmises.length), color: "#00c97a" },
      { label: "Payés",          value: facturesPayees.length,    pct: safe(facturesPayees.length), color: "#00c97a" },
    ];

    const response: AnalyticsResponse = {
      monthly,
      topClients,
      typeBreakdown,
      devisStatut,
      funnel,
      kpis: {
        caEncaisse,
        caFacture,
        caEncaisseN1,
        tauxConversion,
        delaiMoyenPaiement,
        panierMoyenDevis,
        panierMoyenFacture,
        clientsActifs,
        ytdCA,
        nbFacturesPayees: facturesPayees.length,
        nbDevisAcceptes:  devisAcceptes.length,
      },
      updatedAt: now.toISOString(),
    };

    return NextResponse.json(response);

  } catch (err) {
    console.error("[analytics]", err);
    return NextResponse.json({ error: "Erreur interne" }, { status: 500 });
  }
}
