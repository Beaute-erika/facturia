"use client";

import { useState, useEffect, useCallback } from "react";
import { TrendingUp, TrendingDown, Minus, Euro, Receipt, Wallet } from "lucide-react";
import { clsx } from "clsx";
import Card from "@/components/ui/Card";
import type { ProfitPeriod, ProfitResponse } from "@/lib/analytics-types";

// ─── Constantes ───────────────────────────────────────────────────────────────

const PERIODS: { id: ProfitPeriod; label: string }[] = [
  { id: "all",     label: "Tout"        },
  { id: "month",   label: "Ce mois"    },
  { id: "3months", label: "3 mois"     },
  { id: "year",    label: "Cette année" },
];

// ─── Helpers ─────────────────────────────────────────────────────────────────

function fmt(n: number): string {
  if (n >= 1_000) return `${(n / 1000).toFixed(1)}k`;
  return n.toLocaleString("fr-FR", { minimumFractionDigits: 0, maximumFractionDigits: 0 });
}

function fmtFull(n: number): string {
  return n.toLocaleString("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

// ─── Sous-composants ─────────────────────────────────────────────────────────

function MetricCard({
  label,
  value,
  icon: Icon,
  iconColor,
  note,
}: {
  label:      string;
  value:      string;
  icon:       React.ElementType;
  iconColor:  string;
  note?:      string;
}) {
  return (
    <Card className="group hover:border-primary/20">
      <div className="flex items-start justify-between mb-4">
        <div className={clsx("w-10 h-10 rounded-xl flex items-center justify-center", iconColor)}>
          <Icon className="w-5 h-5" />
        </div>
      </div>
      <p className="text-text-muted text-sm font-medium mb-1">{label}</p>
      <p className="text-2xl font-bold font-mono text-text-primary tracking-tight">{value} €</p>
      {note && <p className="text-xs text-text-muted mt-1">{note}</p>}
    </Card>
  );
}

function BalanceBar({ revenue, expenses }: { revenue: number; expenses: number }) {
  if (revenue <= 0 && expenses <= 0) return null;
  const total   = Math.max(revenue + expenses, 1);
  const revPct  = Math.round((revenue  / total) * 100);
  const expPct  = 100 - revPct;

  return (
    <div className="mt-5 pt-5 border-t border-surface-border">
      <div className="flex justify-between text-[11px] text-text-muted mb-2">
        <span>CA encaissé</span>
        <span>Dépenses</span>
      </div>
      <div className="h-3 rounded-full overflow-hidden flex">
        <div
          className="h-full bg-primary transition-all duration-500"
          style={{ width: `${revPct}%` }}
        />
        <div
          className="h-full bg-status-error/70 transition-all duration-500"
          style={{ width: `${expPct}%` }}
        />
      </div>
      <div className="flex justify-between text-[11px] mt-1.5">
        <span className="text-primary font-semibold">{revPct}%</span>
        <span className="text-status-error font-semibold">{expPct}%</span>
      </div>
    </div>
  );
}

function SkeletonCard() {
  return (
    <div className="glass-card p-5 animate-pulse">
      <div className="w-10 h-10 rounded-xl bg-surface-active mb-4" />
      <div className="h-3 w-24 bg-surface-active rounded mb-2" />
      <div className="h-7 w-32 bg-surface-active rounded" />
    </div>
  );
}

// ─── Composant principal ──────────────────────────────────────────────────────

export default function ProfitSection() {
  const [period,  setPeriod]  = useState<ProfitPeriod>("month");
  const [data,    setData]    = useState<ProfitResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState<string | null>(null);

  const fetchData = useCallback((p: ProfitPeriod) => {
    setLoading(true);
    setError(null);
    fetch(`/api/analytics/profit?period=${p}`)
      .then((r) => r.json())
      .then((json: ProfitResponse & { error?: string }) => {
        if (json.error) throw new Error(json.error);
        setData(json);
      })
      .catch((e: Error) => setError(e.message ?? "Erreur inconnue"))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { fetchData(period); }, [period, fetchData]);

  // ── Insight phrase ───────────────────────────────────────────────────────

  function insight(): string | null {
    if (!data) return null;
    if (data.revenueCollected === 0 && data.expenses === 0) return null;

    if (data.revenueCollected === 0)
      return `Aucun CA encaissé sur cette période — ${fmtFull(data.expenses)} € de dépenses engagées.`;

    if (data.expenses === 0)
      return `Aucune dépense sur cette période — bénéfice net = CA encaissé.`;

    const profitStr = fmtFull(Math.abs(data.profit));
    if (data.profit >= 0)
      return `Vos dépenses représentent ${data.expensesRatioPct}% du CA — bénéfice net de ${profitStr} € sur la période.`;

    return `Vos dépenses dépassent le CA encaissé de ${profitStr} €. Pensez à relancer vos factures en attente.`;
  }

  // ── KPI cards ────────────────────────────────────────────────────────────

  const profitPositive = (data?.profit ?? 0) >= 0;

  const cards = data ? [
    {
      label:     "CA encaissé HT",
      value:     fmt(data.revenueCollected),
      icon:      Euro,
      iconColor: "bg-primary/10 text-primary",
      note:      data.revenueInvoiced > data.revenueCollected
        ? `+ ${fmt(data.revenueInvoiced - data.revenueCollected)} € en attente`
        : "Toutes factures payées",
    },
    {
      label:     "Dépenses",
      value:     fmt(data.expenses),
      icon:      Wallet,
      iconColor: "bg-status-error/10 text-status-error",
      note:      data.expensesRatioPct !== null
        ? `${data.expensesRatioPct}% du CA encaissé`
        : "Aucun CA encaissé",
    },
    {
      label:     "Bénéfice net HT",
      value:     `${data.profit >= 0 ? "" : "−"}${fmt(Math.abs(data.profit))}`,
      icon:      profitPositive ? TrendingUp : TrendingDown,
      iconColor: profitPositive
        ? "bg-status-success/10 text-status-success"
        : "bg-status-error/10 text-status-error",
      note:      data.marginPct !== null
        ? `Marge nette : ${data.marginPct}%`
        : undefined,
    },
  ] : [];

  // ── Render ───────────────────────────────────────────────────────────────

  return (
    <div className="space-y-4">

      {/* Header + période */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-primary/10 flex items-center justify-center">
            <Receipt className="w-4 h-4 text-primary" />
          </div>
          <div>
            <h2 className="text-base font-bold text-text-primary leading-none">Bénéfice</h2>
            <p className="text-xs text-text-muted mt-0.5">CA · Dépenses · Rentabilité</p>
          </div>
        </div>

        <div className="flex bg-surface border border-surface-border rounded-xl p-1 gap-1">
          {PERIODS.map((p) => (
            <button
              key={p.id}
              onClick={() => setPeriod(p.id)}
              className={clsx(
                "px-3 py-1.5 rounded-lg text-xs font-medium transition-all",
                period === p.id
                  ? "bg-primary text-background shadow-sm"
                  : "text-text-muted hover:text-text-primary"
              )}
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>

      {/* KPI cards */}
      {loading ? (
        <div className="grid grid-cols-3 gap-4">
          <SkeletonCard /><SkeletonCard /><SkeletonCard />
        </div>
      ) : error ? (
        <div className="glass-card p-5 text-center text-status-error text-sm">{error}</div>
      ) : data ? (
        <>
          <div className="grid grid-cols-3 gap-4">
            {cards.map((c, i) => <MetricCard key={i} {...c} />)}
          </div>

          {/* Insight + barre visuelle */}
          <Card className="py-4">
            <div className="flex items-start gap-3">
              <div className={clsx(
                "w-8 h-8 rounded-lg flex-shrink-0 flex items-center justify-center mt-0.5",
                profitPositive ? "bg-status-success/10" : "bg-status-warning/10"
              )}>
                {profitPositive
                  ? <TrendingUp  className="w-4 h-4 text-status-success" />
                  : <Minus       className="w-4 h-4 text-status-warning" />
                }
              </div>
              <div className="flex-1">
                <p className="text-sm font-semibold text-text-primary">
                  {profitPositive ? "Situation saine" : "Attention — dépenses élevées"}
                </p>
                <p className="text-xs text-text-muted mt-0.5 leading-relaxed">
                  {insight() ?? "Commencez à enregistrer des factures et des dépenses pour voir votre rentabilité."}
                </p>
                <BalanceBar revenue={data.revenueCollected} expenses={data.expenses} />
              </div>
            </div>
          </Card>
        </>
      ) : null}
    </div>
  );
}
