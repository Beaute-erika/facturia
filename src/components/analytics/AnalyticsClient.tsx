"use client";

import { useState, useEffect } from "react";
import {
  TrendingUp, Euro, FileText,
  Clock, BarChart3, PieChart, ArrowUpRight, ArrowDownRight,
  RefreshCw, Loader2,
} from "lucide-react";
import { clsx } from "clsx";
import Card from "@/components/ui/Card";
import CAEvolutionChart from "./CAEvolutionChart";
import DonutChart from "./DonutChart";
import TopClientsChart from "./TopClientsChart";
import MonthlyBarsChart from "./MonthlyBarsChart";
import type { Period, AnalyticsResponse } from "@/lib/analytics-types";

// ─── Constantes ───────────────────────────────────────────────────────────────

const PERIODS: { id: Period; label: string }[] = [
  { id: "mois",      label: "Ce mois"   },
  { id: "trimestre", label: "Trimestre" },
  { id: "semestre",  label: "Semestre"  },
  { id: "année",     label: "Année"     },
];

const OBJECTIF_ANNUEL = 280_000; // € — cible configurable

// ─── Composants internes ──────────────────────────────────────────────────────

function KPICard({
  label, value, change, changePct, icon: Icon, color = "primary", suffix = "", hideChange = false,
}: {
  label: string;
  value: string;
  change: number;
  changePct: number;
  icon: React.ElementType;
  color?: string;
  suffix?: string;
  hideChange?: boolean;
}) {
  const isPositive = changePct >= 0;
  return (
    <Card className="group hover:border-primary/20">
      <div className="flex items-start justify-between mb-4">
        <div className={clsx(
          "w-10 h-10 rounded-xl flex items-center justify-center",
          color === "primary" ? "bg-primary/10 text-primary" :
          color === "info"    ? "bg-status-info/10 text-status-info" :
          color === "warning" ? "bg-status-warning/10 text-status-warning" :
          "bg-surface-active text-text-secondary"
        )}>
          <Icon className="w-5 h-5" />
        </div>
        {!hideChange && (
          <span className={clsx(
            "flex items-center gap-1 text-xs font-semibold px-2 py-1 rounded-lg",
            isPositive ? "text-status-success bg-status-success/10" : "text-status-error bg-status-error/10"
          )}>
            {isPositive ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
            {Math.abs(changePct)}%
          </span>
        )}
      </div>
      <p className="text-text-muted text-sm font-medium mb-1">{label}</p>
      <p className="text-2xl font-bold font-mono text-text-primary tracking-tight">
        {value}{suffix}
      </p>
      {!hideChange && (
        <p className="text-xs text-text-muted mt-1">
          {isPositive ? "+" : ""}{change.toLocaleString("fr-FR")} € vs période N-1
        </p>
      )}
    </Card>
  );
}

function LoadingSkeleton() {
  return (
    <div className="space-y-6 animate-pulse">
      <div className="h-8 w-48 bg-surface-active rounded-lg" />
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="h-32 bg-surface-active rounded-2xl" />
        ))}
      </div>
      <div className="h-72 bg-surface-active rounded-2xl" />
      <div className="grid grid-cols-3 gap-4">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="h-64 bg-surface-active rounded-2xl" />
        ))}
      </div>
    </div>
  );
}

// ─── Composant principal ──────────────────────────────────────────────────────

export default function AnalyticsClient() {
  const [period,    setPeriod]    = useState<Period>("trimestre");
  const [showN1,    setShowN1]    = useState(true);
  const [activeTab, setActiveTab] = useState<"evolution" | "détail">("evolution");
  const [data,      setData]      = useState<AnalyticsResponse | null>(null);
  const [loading,   setLoading]   = useState(true);
  const [error,     setError]     = useState<string | null>(null);

  const fetchData = (p: Period) => {
    setLoading(true);
    setError(null);
    fetch(`/api/analytics?period=${p}`)
      .then(r => r.json())
      .then((json: AnalyticsResponse & { error?: string }) => {
        if (json.error) throw new Error(json.error);
        setData(json);
      })
      .catch(e => setError(e.message ?? "Erreur inconnue"))
      .finally(() => setLoading(false));
  };

  useEffect(() => { fetchData(period); }, [period]);

  // ── KPI dérivés ─────────────────────────────────────────────────────────

  const kpis = data ? [
    {
      label:     "CA encaissé",
      value:     `${(data.kpis.caEncaisse / 1000).toFixed(1)}k`,
      suffix:    " €",
      change:    Math.round(data.kpis.caEncaisse - data.kpis.caEncaisseN1),
      changePct: data.kpis.caEncaisseN1 > 0
        ? Math.round(((data.kpis.caEncaisse - data.kpis.caEncaisseN1) / data.kpis.caEncaisseN1) * 100)
        : 0,
      icon:  Euro,
      color: "primary",
    },
    {
      label:     "CA facturé",
      value:     `${(data.kpis.caFacture / 1000).toFixed(1)}k`,
      suffix:    " €",
      change:    Math.round(data.kpis.caFacture - data.kpis.caEncaisse),
      changePct: data.kpis.caEncaisse > 0
        ? Math.round(((data.kpis.caFacture - data.kpis.caEncaisse) / data.kpis.caEncaisse) * 100)
        : 0,
      icon:  FileText,
      color: "info",
    },
    {
      label:      "Taux de conversion",
      value:      String(data.kpis.tauxConversion),
      suffix:     "%",
      // Vs objectif 70%
      change:     data.kpis.tauxConversion - 70,
      changePct:  Math.round(((data.kpis.tauxConversion - 70) / 70) * 100),
      icon:       TrendingUp,
      color:      "primary",
      hideChange: data.kpis.nbDevisAcceptes === 0,
    },
    {
      label:     "Délai moyen paiement",
      value:     String(data.kpis.delaiMoyenPaiement || "—"),
      suffix:    data.kpis.delaiMoyenPaiement > 0 ? " j" : "",
      // Vs objectif 30j (moins = mieux)
      change:    30 - data.kpis.delaiMoyenPaiement,
      changePct: data.kpis.delaiMoyenPaiement > 0
        ? Math.round(((30 - data.kpis.delaiMoyenPaiement) / 30) * 100)
        : 0,
      icon:       Clock,
      color:      data.kpis.delaiMoyenPaiement > 30 ? "warning" : "primary",
      hideChange: data.kpis.nbFacturesPayees === 0,
    },
  ] : [];

  // Date d'affichage (depuis updatedAt de l'API)
  const updatedLabel = data
    ? new Date(data.updatedAt).toLocaleDateString("fr-FR", {
        day: "numeric", month: "long", year: "numeric",
      })
    : "—";

  // Progression objectif annuel
  const ytdPct  = data ? Math.min(100, Math.round((data.kpis.ytdCA / OBJECTIF_ANNUEL) * 100)) : 0;

  // Comparatif mensuel : 3 derniers mois (les plus récents en premier)
  const recentMonths = data ? [...data.monthly].reverse().slice(0, 3) : [];
  // Valeur max pour normaliser les barres
  const maxCA = recentMonths.length > 0 ? Math.max(...recentMonths.map(m => Math.max(m.ca, m.caN1, 1))) : 1;

  // ── Render ───────────────────────────────────────────────────────────────

  if (loading && !data) return <LoadingSkeleton />;

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-center gap-4">
        <p className="text-status-error font-semibold">Erreur de chargement des données</p>
        <p className="text-text-muted text-sm">{error}</p>
        <button
          onClick={() => fetchData(period)}
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-primary/10 text-primary text-sm font-medium hover:bg-primary/20 transition-colors"
        >
          <RefreshCw className="w-4 h-4" />
          Réessayer
        </button>
      </div>
    );
  }

  if (!data) return null;

  const totalTypeCA = data.typeBreakdown.reduce((s, t) => s + t.value, 0);

  return (
    <div className="space-y-6 animate-fade-in">

      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-text-primary">Analytics</h1>
          <p className="text-text-muted mt-1">
            Données au{" "}
            <span className="text-text-primary font-medium">{updatedLabel}</span>
          </p>
        </div>
        <button
          onClick={() => fetchData(period)}
          disabled={loading}
          className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs text-text-muted hover:text-text-primary hover:bg-surface-hover transition-colors border border-surface-border disabled:opacity-50"
        >
          {loading
            ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
            : <RefreshCw className="w-3.5 h-3.5" />}
          Actualiser
        </button>
      </div>

      {/* Sélecteur période */}
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

      {/* Graphique principal */}
      <Card>
        <div className="flex items-center justify-between mb-5 flex-wrap gap-3">
          <div>
            <h3 className="text-base font-semibold text-text-primary">Évolution du chiffre d&apos;affaires</h3>
            <p className="text-sm text-text-muted mt-0.5">
              CA encaissé / facturé{showN1 ? " vs N-1" : ""}
            </p>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-3 text-xs text-text-muted">
              <span className="flex items-center gap-1.5"><span className="w-3 h-0.5 bg-primary rounded inline-block" />Encaissé</span>
              <span className="flex items-center gap-1.5"><span className="w-3 h-0.5 bg-status-info rounded inline-block" />Facturé</span>
              {showN1 && <span className="flex items-center gap-1.5"><span className="w-3 h-0.5 bg-text-muted rounded inline-block" />N-1</span>}
            </div>
            <div className="flex bg-surface-active rounded-lg p-0.5">
              {([
                { id: "evolution", icon: BarChart3, label: "Courbe" },
                { id: "détail",    icon: PieChart,  label: "Détail"  },
              ] as const).map((t) => (
                <button
                  key={t.id}
                  onClick={() => setActiveTab(t.id)}
                  className={clsx(
                    "flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium transition-all",
                    activeTab === t.id
                      ? "bg-surface text-text-primary shadow-sm"
                      : "text-text-muted hover:text-text-secondary"
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

        {data.monthly.length > 0 ? (
          activeTab === "evolution"
            ? <CAEvolutionChart data={data.monthly} showN1={showN1} />
            : <MonthlyBarsChart data={data.monthly} />
        ) : (
          <div className="h-64 flex items-center justify-center text-text-muted text-sm">
            Aucune donnée pour cette période
          </div>
        )}
      </Card>

      {/* Ligne de 3 colonnes */}
      <div className="grid grid-cols-3 gap-4">

        {/* CA par type client */}
        <Card>
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-semibold text-text-primary">CA par type client</h3>
            <span className="text-[10px] text-text-muted font-mono">
              {(totalTypeCA / 1000).toFixed(0)}k €
            </span>
          </div>
          <DonutChart data={data.typeBreakdown} total={totalTypeCA} label="CA encaissé" />
          <div className="space-y-2 mt-2">
            {data.typeBreakdown.map((t, i) => (
              <div key={i} className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: t.color }} />
                  <span className="text-xs text-text-secondary">{t.name}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-text-muted">
                    {totalTypeCA > 0 ? Math.round((t.value / totalTypeCA) * 100) : 0}%
                  </span>
                  <span className="text-xs font-bold font-mono text-text-primary">
                    {(t.value / 1000).toFixed(0)}k €
                  </span>
                </div>
              </div>
            ))}
          </div>
        </Card>

        {/* Devis par statut (montants TTC) */}
        <Card>
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-semibold text-text-primary">Devis par statut</h3>
            <span className="text-[10px] text-text-muted">montants TTC</span>
          </div>
          <DonutChart
            data={data.devisStatut}
            total={data.devisStatut.reduce((s, d) => s + d.value, 0)}
            label="Total devis"
          />
          <div className="space-y-2 mt-2">
            {data.devisStatut.map((w, i) => {
              const totalDevis = data.devisStatut.reduce((s, d) => s + d.value, 0);
              const pct = totalDevis > 0 ? Math.round((w.value / totalDevis) * 100) : 0;
              return (
                <div key={i} className="flex items-center gap-3">
                  <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: w.color }} />
                  <span className="text-xs text-text-secondary flex-1">{w.name}</span>
                  <div className="flex-1 h-1.5 bg-surface-active rounded-full overflow-hidden">
                    <div className="h-full rounded-full" style={{ width: `${pct}%`, background: w.color }} />
                  </div>
                  <span className="text-xs font-semibold text-text-primary w-8 text-right">{pct}%</span>
                </div>
              );
            })}
          </div>
        </Card>

        {/* Entonnoir devis */}
        <Card>
          <h3 className="text-sm font-semibold text-text-primary mb-4">Entonnoir devis</h3>
          {data.funnel[0].value > 0 ? (
            <>
              <div className="space-y-2">
                {data.funnel.map((step, i) => (
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
                    {i < data.funnel.length - 1 && (
                      <p className="text-[9px] text-text-muted text-right mt-0.5">
                        ↓ {data.funnel[i + 1].pct < step.pct
                          ? `${step.pct - data.funnel[i + 1].pct}% de perte`
                          : "—"}
                      </p>
                    )}
                  </div>
                ))}
              </div>
              <div className="mt-4 pt-3 border-t border-surface-border flex justify-between text-xs">
                <span className="text-text-muted">Taux de transformation final</span>
                <span className="font-bold font-mono text-primary">
                  {data.funnel[data.funnel.length - 1].pct}%
                </span>
              </div>
            </>
          ) : (
            <div className="flex items-center justify-center h-40 text-text-muted text-sm">
              Aucun devis sur cette période
            </div>
          )}
        </Card>
      </div>

      {/* Ligne du bas */}
      <div className="grid grid-cols-5 gap-4">

        {/* Top clients — 3 cols */}
        <Card className="col-span-3">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-semibold text-text-primary">Top clients par CA</h3>
              <p className="text-xs text-text-muted mt-0.5">5 premiers clients (toutes périodes)</p>
            </div>
            <div className="flex items-center gap-3 text-[10px] text-text-muted">
              <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-primary inline-block" /> Public</span>
              <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-status-info inline-block" /> Pro</span>
              <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-status-warning inline-block" /> Particulier</span>
            </div>
          </div>

          {data.topClients.length > 0 ? (
            <>
              <TopClientsChart data={data.topClients} />
              <div className="mt-4 space-y-1.5">
                {data.topClients.map((c, i) => {
                  const pct = Math.round((c.ca / data.topClients[0].ca) * 100);
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
            </>
          ) : (
            <div className="flex items-center justify-center h-40 text-text-muted text-sm">
              Aucune facture payée enregistrée
            </div>
          )}
        </Card>

        {/* Stats droite — 2 cols */}
        <div className="col-span-2 space-y-4">

          {/* Comparatif mensuel */}
          <Card>
            <h3 className="text-sm font-semibold text-text-primary mb-3">Comparatif mensuel</h3>
            {recentMonths.length > 0 ? (
              <div className="space-y-3">
                {recentMonths.map((m, i) => (
                  <div key={i}>
                    <div className="flex justify-between text-xs mb-1">
                      <span className="text-text-secondary">{m.month}</span>
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-semibold text-text-primary">
                          {(m.ca / 1000).toFixed(1)}k €
                        </span>
                        {m.caN1 > 0 && (
                          <span className={clsx(
                            "text-[10px] font-semibold",
                            m.ca >= m.caN1 ? "text-status-success" : "text-status-error"
                          )}>
                            {m.ca >= m.caN1 ? "+" : ""}
                            {Math.round(((m.ca - m.caN1) / m.caN1) * 100)}%
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="relative h-2 bg-surface-active rounded-full overflow-hidden">
                      {m.caN1 > 0 && (
                        <div
                          className="absolute top-0 bottom-0 left-0 bg-surface-border rounded-full"
                          style={{ width: `${(m.caN1 / maxCA) * 100}%` }}
                        />
                      )}
                      <div
                        className="absolute top-0 bottom-0 left-0 bg-primary rounded-full"
                        style={{ width: `${(m.ca / maxCA) * 100}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-text-muted text-xs">Aucune donnée</p>
            )}
          </Card>

          {/* Objectif annuel */}
          <Card>
            <h3 className="text-sm font-semibold text-text-primary mb-3">Objectif annuel</h3>
            <div className="relative mb-4">
              <div className="flex justify-between text-xs mb-1.5">
                <span className="text-text-muted">Progression</span>
                <span className="font-semibold text-text-primary">{ytdPct}%</span>
              </div>
              <div className="h-3 bg-surface-active rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-primary to-primary/70 rounded-full transition-all"
                  style={{ width: `${ytdPct}%` }}
                />
              </div>
              <div className="flex justify-between text-[10px] text-text-muted mt-1">
                <span>{(data.kpis.ytdCA / 1000).toFixed(1)}k €</span>
                <span>Objectif : {(OBJECTIF_ANNUEL / 1000).toFixed(0)}k €</span>
              </div>
            </div>

            <div className="space-y-2">
              {[
                {
                  label:  "Clients actifs",
                  value:  String(data.kpis.clientsActifs),
                  target: "15",
                  pct:    Math.min(100, Math.round((data.kpis.clientsActifs / 15) * 100)),
                },
                {
                  label:  "Taux conversion",
                  value:  `${data.kpis.tauxConversion}%`,
                  target: "75%",
                  pct:    Math.min(100, Math.round((data.kpis.tauxConversion / 75) * 100)),
                },
                {
                  label:  "Délai paiement",
                  value:  data.kpis.delaiMoyenPaiement > 0 ? `${data.kpis.delaiMoyenPaiement}j` : "—",
                  target: "20j",
                  // plus le délai est bas, mieux c'est → pct = 1 - (délai / 60)
                  pct:    data.kpis.delaiMoyenPaiement > 0
                    ? Math.min(100, Math.round(Math.max(0, (1 - data.kpis.delaiMoyenPaiement / 60)) * 100))
                    : 0,
                },
              ].map((obj, i) => (
                <div key={i} className="flex items-center gap-2">
                  <span className="text-[10px] text-text-muted flex-1">{obj.label}</span>
                  <div className="w-16 h-1 bg-surface-active rounded-full overflow-hidden">
                    <div
                      className="h-full bg-primary/70 rounded-full"
                      style={{ width: `${obj.pct}%` }}
                    />
                  </div>
                  <span className="text-[10px] font-mono text-text-primary w-16 text-right">
                    {obj.value} / {obj.target}
                  </span>
                </div>
              ))}
            </div>
          </Card>

          {/* Indicateurs clés */}
          <Card className="py-4">
            <h3 className="text-sm font-semibold text-text-primary mb-3">Indicateurs clés</h3>
            <div className="space-y-2.5">
              {[
                {
                  label: "Panier moyen devis",
                  value: data.kpis.panierMoyenDevis > 0
                    ? `${data.kpis.panierMoyenDevis.toLocaleString("fr-FR")} €`
                    : "—",
                },
                {
                  label: "Panier moyen facture",
                  value: data.kpis.panierMoyenFacture > 0
                    ? `${data.kpis.panierMoyenFacture.toLocaleString("fr-FR")} €`
                    : "—",
                },
                {
                  label: "Factures payées",
                  value: String(data.kpis.nbFacturesPayees),
                },
                {
                  label: "Devis acceptés",
                  value: String(data.kpis.nbDevisAcceptes),
                },
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
