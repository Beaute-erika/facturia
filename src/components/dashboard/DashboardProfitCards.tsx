"use client";

import { useEffect, useState } from "react";
import { Euro, Wallet, TrendingUp, TrendingDown } from "lucide-react";
import KPICard from "./KPICard";
import type { ProfitResponse } from "@/lib/analytics-types";

// ─── Helpers ─────────────────────────────────────────────────────────────────

function fmt(n: number): string {
  return Math.round(n).toLocaleString("fr-FR");
}

function SkeletonCard() {
  return (
    <div className="glass-card p-5 animate-pulse">
      <div className="flex items-start justify-between mb-4">
        <div className="w-10 h-10 rounded-xl bg-surface-active" />
      </div>
      <div className="h-3 w-28 bg-surface-active rounded mb-2" />
      <div className="h-7 w-36 bg-surface-active rounded" />
      <div className="h-2.5 w-20 bg-surface-active rounded mt-2" />
    </div>
  );
}

// ─── Composant ───────────────────────────────────────────────────────────────

export default function DashboardProfitCards() {
  const [data,    setData]    = useState<ProfitResponse | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/analytics/profit?period=month")
      .then((r) => r.json())
      .then((json: ProfitResponse & { error?: string }) => {
        if (!json.error) setData(json);
      })
      .catch(() => {/* silencieux — le dashboard reste utilisable */})
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="grid grid-cols-3 gap-3 md:gap-4">
        <SkeletonCard /><SkeletonCard /><SkeletonCard />
      </div>
    );
  }

  if (!data) return null;

  const profitPositive = data.profit >= 0;
  const profitStr      = `${profitPositive ? "" : "−"}${fmt(Math.abs(data.profit))}`;

  const insight = (() => {
    if (data.revenueCollected === 0 && data.expenses === 0)
      return "Aucun mouvement financier ce mois-ci.";
    if (data.revenueCollected === 0)
      return `${fmt(data.expenses)} € de dépenses ce mois — aucun encaissement enregistré.`;
    if (data.expenses === 0)
      return `Bénéfice net = CA encaissé — aucune dépense ce mois.`;
    if (profitPositive)
      return `Vous avez généré ${profitStr} € de bénéfice ce mois-ci (marge ${data.marginPct}%).`;
    return `Dépenses supérieures au CA encaissé ce mois — relancez vos factures en attente.`;
  })();

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-3 gap-3 md:gap-4">
        <KPICard
          title="CA encaissé HT"
          value={fmt(data.revenueCollected)}
          suffix=" €"
          icon={Euro}
          color="primary"
          period={
            data.revenueInvoiced > data.revenueCollected
              ? `+ ${fmt(data.revenueInvoiced - data.revenueCollected)} € en attente`
              : "Toutes factures payées"
          }
        />
        <KPICard
          title="Dépenses"
          value={fmt(data.expenses)}
          suffix=" €"
          icon={Wallet}
          color={data.expenses > data.revenueCollected ? "warning" : "primary"}
          period={
            data.expensesRatioPct !== null
              ? `${data.expensesRatioPct}% du CA encaissé`
              : "Aucun CA ce mois"
          }
        />
        <KPICard
          title="Bénéfice net HT"
          value={profitStr}
          suffix=" €"
          icon={profitPositive ? TrendingUp : TrendingDown}
          color={profitPositive ? "primary" : "error"}
          period={
            data.marginPct !== null
              ? `Marge nette : ${data.marginPct}%`
              : "—"
          }
        />
      </div>

      {/* Phrase d'insight */}
      <p className="text-xs text-text-muted px-1">{insight}</p>
    </div>
  );
}
