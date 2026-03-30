import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase-server";
import type { ProfitPeriod } from "@/lib/analytics-types";
import type { FactureStatut } from "@/lib/database.types";

// Statuts de facture comptabilisés dans le CA :
//   payee      → CA encaissé (argent reçu)
//   envoyee    → CA facturé en attente de règlement
//   en_retard  → CA facturé en retard de règlement
// Exclus :
//   brouillon  → pas encore envoyé, ne représente pas de CA
//   annulee    → annulée, montant nul
const CA_STATUTS: FactureStatut[] = ["payee", "envoyee", "en_retard"];

function toDateStr(d: Date): string {
  return d.toISOString().split("T")[0];
}

function periodToStartDate(period: ProfitPeriod): Date | null {
  const now = new Date();
  switch (period) {
    case "month":   return new Date(now.getFullYear(), now.getMonth(), 1);
    case "3months": return new Date(now.getFullYear(), now.getMonth() - 2, 1);
    case "year":    return new Date(now.getFullYear(), 0, 1);
    case "all":     return null;
  }
}

/** GET /api/analytics/profit?period=month|3months|year|all */
export async function GET(req: NextRequest) {
  try {
    const supabase = await createServerClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });

    const period   = (req.nextUrl.searchParams.get("period") ?? "month") as ProfitPeriod;
    const startDate = periodToStartDate(period);
    const startStr  = startDate ? toDateStr(startDate) : null;
    const endStr    = toDateStr(new Date());

    // ── Factures ────────────────────────────────────────────────────────────
    // On filtre par date_emission pour inclure les factures émises sur la période.
    // Pour les payées, date_emission est cohérent (la facture a été créée et payée).
    let facturesQ = supabase
      .from("factures")
      .select("statut, montant_ht")
      .eq("user_id", user.id)
      .in("statut", CA_STATUTS);

    if (startStr) {
      facturesQ = facturesQ
        .gte("date_emission", startStr)
        .lte("date_emission", endStr);
    }

    const { data: factures, error: factErr } = await facturesQ;
    if (factErr) throw factErr;

    // ── Dépenses ─────────────────────────────────────────────────────────────
    let expensesQ = supabase
      .from("expenses")
      .select("amount")
      .eq("user_id", user.id);

    if (startStr) {
      expensesQ = expensesQ
        .gte("expense_date", startStr)
        .lte("expense_date", endStr);
    }

    const { data: expenses, error: expErr } = await expensesQ;
    if (expErr) throw expErr;

    // ── Calculs ───────────────────────────────────────────────────────────────

    const rows = factures ?? [];

    // CA encaissé : uniquement les factures payées (argent effectivement reçu)
    const revenueCollected = rows
      .filter((f) => f.statut === "payee")
      .reduce((s, f) => s + Number(f.montant_ht ?? 0), 0);

    // CA facturé : toutes factures émises (envoyées, en retard, payées)
    const revenueInvoiced = rows
      .reduce((s, f) => s + Number(f.montant_ht ?? 0), 0);

    // Dépenses totales de la période
    const totalExpenses = (expenses ?? [])
      .reduce((s, e) => s + Number(e.amount ?? 0), 0);

    // Bénéfice net = CA encaissé − dépenses
    const profit = revenueCollected - totalExpenses;

    // Marge nette = bénéfice / CA encaissé × 100
    const marginPct = revenueCollected > 0
      ? Math.round((profit / revenueCollected) * 100)
      : null;

    // Part des dépenses dans le CA encaissé
    const expensesRatioPct = revenueCollected > 0
      ? Math.round((totalExpenses / revenueCollected) * 100)
      : null;

    const round2 = (n: number) => Math.round(n * 100) / 100;

    return NextResponse.json({
      period,
      revenueCollected:  round2(revenueCollected),
      revenueInvoiced:   round2(revenueInvoiced),
      expenses:          round2(totalExpenses),
      profit:            round2(profit),
      marginPct,
      expensesRatioPct,
      currency: "EUR",
    });
  } catch (err) {
    console.error("[analytics/profit/GET]", err);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
