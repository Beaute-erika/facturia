"use client";

import { useState } from "react";
import {
  TrendingUp, Euro, FileText,
  Clock, BarChart3, PieChart, ArrowUpRight, ArrowDownRight,
  Download, RefreshCw,
} from "lucide-react";
import { clsx } from "clsx";
import Card from "@/components/ui/Card";
import CAEvolutionChart from "./CAEvolutionChart";
import DonutChart from "./DonutChart";
import TopClientsChart from "./TopClientsChart";
import MonthlyBarsChart from "./MonthlyBarsChart";
import {
  MONTHLY_DATA, TOP_CLIENTS, TYPE_BREAKDOWN,
  FUNNEL_DATA, WORK_BREAKDOWN, PAYMENT_DELAY,
  getDataForPeriod, sumCA, sumFacture, sumN1,
  type Period,
} from "@/lib/analytics-data";

const PERIODS: { id: Period; label: string }[] = [
  { id: "mois", label: "Ce mois" },
  { id: "trimestre", label: "Trimestre" },
  { id: "semestre", label: "Semestre" },
  { id: "année", label: "Année" },
];

function KPICard({
  label, value, change, changePct, icon: Icon, color = "primary", suffix = "",
}: {
  label: string;
  value: string;
  change: number;
  changePct: number;
  icon: React.ElementType;
  color?: string;
  suffix?: string;
}) {
  const isPositive = changePct >= 0;
  return (
    <Card className="group hover:border-primary/20">
      <div className="flex items-start justify-between mb-4">
        <div className={clsx(
          "w-10 h-10 rounded-xl flex items-center justify-center",
          color === "primary" ? "bg-primary/10 text-primary" :
          color === "info" ? "bg-status-info/10 text-status-info" :
          color === "warning" ? "bg-status-warning/10 text-status-warning" :
          "bg-surface-active text-text-secondary"
        )}>
          <Icon className="w-5 h-5" />
        </div>
        <span className={clsx(
          "flex items-center gap-1 text-xs font-semibold px-2 py-1 rounded-lg",
          isPositive ? "text-status-success bg-status-success/10" : "text-status-error bg-status-error/10"
        )}>
          {isPositive ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
          {Math.abs(changePct)}%
        </span>
      </div>
      <p className="text-text-muted text-sm font-medium mb-1">{label}</p>
      <p className="text-2xl font-bold font-mono text-text-primary tracking-tight">
        {value}{suffix}
      </p>
      <p className="text-xs text-text-muted mt-1">
        {isPositive ? "+" : ""}{change.toLocaleString("fr-FR")} € vs période précédente
      </p>
    </Card>
  );
}

export default function AnalyticsClient() {
  const [period, setPeriod] = useState<Period>("trimestre");
  const [showN1, setShowN1] = useState(true);
  const [activeTab, setActiveTab] = useState<"evolution" | "détail">("evolution");

  const data = getDataForPeriod(period);
  const totalCA = sumCA(data);
  const totalFacture = sumFacture(data);
  const totalN1 = sumN1(data);
  const caChange = totalCA - totalN1;
  const caPct = totalN1 > 0 ? Math.round((caChange / totalN1) * 100) : 0;

  const totalTypeCA = TYPE_BREAKDOWN.reduce((s, t) => s + t.value, 0);
  const avgPaymentDelay = Math.round(
    PAYMENT_DELAY.reduce((s, d) => s + d.days, 0) / PAYMENT_DELAY.length
  );

  const kpis = [
    {
      label: "CA encaissé",
      value: `${(totalCA / 1000).toFixed(1)}k`,
      suffix: " €",
      change: caChange,
      changePct: caPct,
      icon: Euro,
      color: "primary",
    },
    {
      label: "CA facturé",
      value: `${(totalFacture / 1000).toFixed(1)}k`,
      suffix: " €",
      change: totalFacture - totalCA,
      changePct: Math.round(((totalFacture - totalCA) / Math.max(totalCA, 1)) * 100),
      icon: FileText,
      color: "info",
    },
    {
      label: "Taux de conversion",
      value: "68",
      suffix: "%",
      change: 4,
      changePct: 6,
      icon: TrendingUp,
      color: "primary",
    },
    {
      label: "Délai moyen paiement",
      value: String(avgPaymentDelay),
      suffix: " j",
      change: -8,
      changePct: -18,
      icon: Clock,
      color: avgPaymentDelay > 30 ? "warning" : "primary",
    },
  ];

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-text-primary">Analytics</h1>
          <p className="text-text-muted mt-1">
            Données au{" "}
            <span className="text-text-primary font-medium">16 mars 2026</span>
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs text-text-muted hover:text-text-primary hover:bg-surface-hover transition-colors border border-surface-border">
            <Download className="w-3.5 h-3.5" />
            Exporter
          </button>
          <button className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs text-text-muted hover:text-text-primary hover:bg-surface-hover transition-colors border border-surface-border">
            <RefreshCw className="w-3.5 h-3.5" />
            Actualiser
          </button>
        </div>
      </div>

      {/* Period selector */}
      <div className="flex items-center gap-2">
        <span className="text-xs text-text-muted font-medium">Période :</span>
        <div className="flex bg-surface border border-surface-border rounded-xl p-1 gap-1">
          {PERIODS.map((p) => (
            <button
              key={p.id}
              onClick={() => setPeriod(p.id)}
              className={clsx(
                "px-4 py-1.5 rounded-lg text-xs font-medium transition-all",
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

      {/* KPI row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {kpis.map((kpi, i) => (
          <KPICard key={i} {...kpi} />
        ))}
      </div>

      {/* Main chart */}
      <Card>
        <div className="flex items-center justify-between mb-5 flex-wrap gap-3">
          <div>
            <h3 className="text-base font-semibold text-text-primary">Évolution du chiffre d&apos;affaires</h3>
            <p className="text-sm text-text-muted mt-0.5">
              CA encaissé / facturé{showN1 ? " vs N-1" : ""}
            </p>
          </div>
          <div className="flex items-center gap-3">
            {/* Legend */}
            <div className="flex items-center gap-3 text-xs text-text-muted">
              <span className="flex items-center gap-1.5"><span className="w-3 h-0.5 bg-primary rounded inline-block" />Encaissé</span>
              <span className="flex items-center gap-1.5"><span className="w-3 h-0.5 bg-status-info rounded inline-block" />Facturé</span>
              {showN1 && <span className="flex items-center gap-1.5"><span className="w-3 h-0.5 bg-text-muted rounded inline-block border-dashed" />N-1</span>}
            </div>
            {/* Tab toggle */}
            <div className="flex bg-surface-active rounded-lg p-0.5">
              {([
                { id: "evolution", icon: BarChart3, label: "Courbe" },
                { id: "détail", icon: PieChart, label: "Détail" },
              ] as const).map((t) => (
                <button
                  key={t.id}
                  onClick={() => setActiveTab(t.id)}
                  className={clsx(
                    "flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium transition-all",
                    activeTab === t.id ? "bg-surface text-text-primary shadow-sm" : "text-text-muted hover:text-text-secondary"
                  )}
                >
                  <t.icon className="w-3.5 h-3.5" />
                  {t.label}
                </button>
              ))}
            </div>
            <label className="flex items-center gap-2 text-xs text-text-muted cursor-pointer">
              <input
                type="checkbox"
                checked={showN1}
                onChange={(e) => setShowN1(e.target.checked)}
                className="w-3.5 h-3.5 accent-[#00c97a]"
              />
              Comparer N-1
            </label>
          </div>
        </div>

        {activeTab === "evolution" ? (
          <CAEvolutionChart data={period === "année" ? MONTHLY_DATA : data.length > 1 ? data : MONTHLY_DATA.slice(0, 3)} showN1={showN1} />
        ) : (
          <MonthlyBarsChart data={period === "année" ? MONTHLY_DATA : data.length > 1 ? data : MONTHLY_DATA.slice(0, 3)} />
        )}
      </Card>

      {/* 3-column row */}
      <div className="grid grid-cols-3 gap-4">
        {/* CA par type client */}
        <Card>
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-semibold text-text-primary">CA par type client</h3>
            <span className="text-[10px] text-text-muted font-mono">{(totalTypeCA / 1000).toFixed(0)}k €</span>
          </div>
          <DonutChart data={TYPE_BREAKDOWN} total={totalTypeCA} label="CA total" />
          <div className="space-y-2 mt-2">
            {TYPE_BREAKDOWN.map((t, i) => (
              <div key={i} className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: t.color }} />
                  <span className="text-xs text-text-secondary">{t.name}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-text-muted">
                    {Math.round((t.value / totalTypeCA) * 100)}%
                  </span>
                  <span className="text-xs font-bold font-mono text-text-primary">
                    {(t.value / 1000).toFixed(0)}k €
                  </span>
                </div>
              </div>
            ))}
          </div>
        </Card>

        {/* Répartition travaux */}
        <Card>
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-semibold text-text-primary">Types de travaux</h3>
          </div>
          <DonutChart data={WORK_BREAKDOWN} />
          <div className="space-y-2 mt-2">
            {WORK_BREAKDOWN.map((w, i) => (
              <div key={i} className="flex items-center gap-3">
                <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: w.color }} />
                <span className="text-xs text-text-secondary flex-1">{w.name}</span>
                <div className="flex-1 h-1.5 bg-surface-active rounded-full overflow-hidden">
                  <div className="h-full rounded-full" style={{ width: `${w.value}%`, background: w.color }} />
                </div>
                <span className="text-xs font-semibold text-text-primary w-8 text-right">{w.value}%</span>
              </div>
            ))}
          </div>
        </Card>

        {/* Funnel devis */}
        <Card>
          <h3 className="text-sm font-semibold text-text-primary mb-4">Entonnoir devis</h3>
          <div className="space-y-2">
            {FUNNEL_DATA.map((step, i) => (
              <div key={i}>
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-text-secondary">{step.label}</span>
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-semibold text-text-primary">{step.value}</span>
                    <span className="text-text-muted">({step.pct}%)</span>
                  </div>
                </div>
                <div className="h-6 bg-surface-active rounded-lg overflow-hidden relative">
                  <div
                    className="h-full rounded-lg flex items-center pl-2 transition-all duration-500"
                    style={{ width: `${step.pct}%`, background: step.color, opacity: 0.85 }}
                  >
                    {step.pct > 20 && (
                      <span className="text-[10px] font-bold text-white">{step.value}</span>
                    )}
                  </div>
                </div>
                {i < FUNNEL_DATA.length - 1 && (
                  <p className="text-[9px] text-text-muted text-right mt-0.5">
                    ↓ {100 - FUNNEL_DATA[i + 1].pct}% de perte
                  </p>
                )}
              </div>
            ))}
          </div>
          <div className="mt-4 pt-3 border-t border-surface-border flex justify-between text-xs">
            <span className="text-text-muted">Taux de transformation final</span>
            <span className="font-bold font-mono text-primary">
              {FUNNEL_DATA[FUNNEL_DATA.length - 1].pct}%
            </span>
          </div>
        </Card>
      </div>

      {/* Bottom row */}
      <div className="grid grid-cols-5 gap-4">
        {/* Top clients - 3 cols */}
        <Card className="col-span-3">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-semibold text-text-primary">Top clients par CA</h3>
              <p className="text-xs text-text-muted mt-0.5">5 premiers clients</p>
            </div>
            <div className="flex items-center gap-3 text-[10px] text-text-muted">
              <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-primary inline-block" /> Public</span>
              <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-status-info inline-block" /> Pro</span>
              <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-status-warning inline-block" /> Particulier</span>
            </div>
          </div>
          <TopClientsChart data={TOP_CLIENTS} />

          {/* Table summary */}
          <div className="mt-4 space-y-1.5">
            {TOP_CLIENTS.map((c, i) => {
              const pct = Math.round((c.ca / TOP_CLIENTS[0].ca) * 100);
              return (
                <div key={i} className="flex items-center gap-3">
                  <span className="text-[10px] font-bold text-text-muted w-4">{i + 1}</span>
                  <span className="text-xs text-text-secondary flex-1 truncate">{c.name}</span>
                  <div className="w-20 h-1 bg-surface-active rounded-full overflow-hidden">
                    <div className="h-full bg-primary/60 rounded-full" style={{ width: `${pct}%` }} />
                  </div>
                  <span className="text-xs font-mono font-semibold text-text-primary w-20 text-right">
                    {(c.ca / 1000).toFixed(1)}k €
                  </span>
                </div>
              );
            })}
          </div>
        </Card>

        {/* Right stats - 2 cols */}
        <div className="col-span-2 space-y-4">
          {/* Monthly comparison */}
          <Card>
            <h3 className="text-sm font-semibold text-text-primary mb-3">Comparatif mensuel</h3>
            <div className="space-y-3">
              {MONTHLY_DATA.slice(0, 3).map((m, i) => (
                <div key={i}>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-text-secondary">{m.month}</span>
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-semibold text-text-primary">
                        {(m.ca / 1000).toFixed(1)}k €
                      </span>
                      <span className={clsx(
                        "text-[10px] font-semibold",
                        m.ca > m.caN1 ? "text-status-success" : "text-status-error"
                      )}>
                        {m.ca > m.caN1 ? "+" : ""}{Math.round(((m.ca - m.caN1) / m.caN1) * 100)}%
                      </span>
                    </div>
                  </div>
                  <div className="relative h-2 bg-surface-active rounded-full overflow-hidden">
                    {/* N-1 bar */}
                    <div
                      className="absolute top-0 bottom-0 left-0 bg-surface-border rounded-full"
                      style={{ width: `${(m.caN1 / 35000) * 100}%` }}
                    />
                    {/* Current bar */}
                    <div
                      className="absolute top-0 bottom-0 left-0 bg-primary rounded-full"
                      style={{ width: `${(m.ca / 35000) * 100}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </Card>

          {/* Objectif */}
          <Card>
            <h3 className="text-sm font-semibold text-text-primary mb-3">Objectif annuel</h3>
            <div className="relative mb-4">
              <div className="flex justify-between text-xs mb-1.5">
                <span className="text-text-muted">Progression</span>
                <span className="font-semibold text-text-primary">
                  {Math.round((sumCA(MONTHLY_DATA.slice(0, 3)) / 280000) * 100)}%
                </span>
              </div>
              <div className="h-3 bg-surface-active rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-primary to-primary/70 rounded-full transition-all"
                  style={{ width: `${Math.round((sumCA(MONTHLY_DATA.slice(0, 3)) / 280000) * 100)}%` }}
                />
              </div>
              <div className="flex justify-between text-[10px] text-text-muted mt-1">
                <span>{(sumCA(MONTHLY_DATA.slice(0, 3)) / 1000).toFixed(1)}k €</span>
                <span>Objectif : 280k €</span>
              </div>
            </div>

            <div className="space-y-2">
              {[
                { label: "Clients actifs", value: "5", target: "15", pct: 33 },
                { label: "Taux conversion", value: "68%", target: "75%", pct: 91 },
                { label: "Délai paiement", value: `${avgPaymentDelay}j`, target: "20j", pct: 70 },
              ].map((obj, i) => (
                <div key={i} className="flex items-center gap-2">
                  <span className="text-[10px] text-text-muted flex-1">{obj.label}</span>
                  <div className="w-16 h-1 bg-surface-active rounded-full overflow-hidden">
                    <div
                      className="h-full bg-primary/70 rounded-full"
                      style={{ width: `${obj.pct}%` }}
                    />
                  </div>
                  <span className="text-[10px] font-mono text-text-primary w-14 text-right">
                    {obj.value} / {obj.target}
                  </span>
                </div>
              ))}
            </div>
          </Card>

          {/* Quick stats */}
          <Card className="py-4">
            <h3 className="text-sm font-semibold text-text-primary mb-3">Indicateurs clés</h3>
            <div className="space-y-2.5">
              {[
                { label: "Panier moyen devis", value: "6 840 €" },
                { label: "Panier moyen facture", value: "4 920 €" },
                { label: "Nb chantiers / mois", value: "4,3" },
                { label: "CA / chantier", value: "5 200 €" },
              ].map((s, i) => (
                <div key={i} className="flex justify-between items-center">
                  <span className="text-xs text-text-muted">{s.label}</span>
                  <span className="text-xs font-bold font-mono text-text-primary">{s.value}</span>
                </div>
              ))}
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
