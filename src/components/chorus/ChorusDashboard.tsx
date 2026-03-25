"use client";

import { useEffect, useState } from "react";
import { Building2, CheckCircle2, XCircle, Clock, TrendingUp, Lock, RefreshCw, Zap } from "lucide-react";
import { clsx } from "clsx";
import Card from "@/components/ui/Card";

interface ChorusStats {
  total_chorus: number;
  total_envoyes: number;
  total_acceptees: number;
  total_rejetees: number;
  total_en_attente: number;
  montant_total_envoye: number;
  montant_accepte: number;
  taux_acceptation: number;
  taux_rejet: number;
  queue_pending: number;
  plan: string;
  locked?: boolean;
  error?: string;
}

/**
 * ChorusDashboard — Tableau de bord Chorus Pro (plan pro/business).
 *
 * États :
 *   - Skeleton    : chargement initial
 *   - Locked      : plan starter → invite à upgrader
 *   - Empty       : plan pro+ mais aucune facture Chorus encore
 *   - Dashboard   : statistiques complètes
 */
export default function ChorusDashboard() {
  const [stats, setStats] = useState<ChorusStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchStats = async (silent = false) => {
    if (!silent) setLoading(true);
    else setRefreshing(true);
    try {
      const resp = await fetch("/api/chorus/stats");
      const data = await resp.json() as ChorusStats;
      setStats(data);
    } catch {
      setStats(null);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => { fetchStats(); }, []);

  // ─── Skeleton chargement initial ────────────────────────────────────────────
  if (loading) {
    return (
      <Card className="p-0 overflow-hidden animate-pulse">
        <div className="px-5 py-3.5 border-b border-surface-border flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-lg bg-surface-active" />
          <div className="space-y-1.5">
            <div className="w-36 h-3 bg-surface-active rounded" />
            <div className="w-24 h-2.5 bg-surface-active rounded" />
          </div>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 divide-x divide-y md:divide-y-0 divide-surface-border">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="p-4 space-y-2">
              <div className="w-20 h-2.5 bg-surface-active rounded" />
              <div className="w-10 h-6 bg-surface-active rounded" />
              <div className="w-24 h-2 bg-surface-active rounded" />
            </div>
          ))}
        </div>
      </Card>
    );
  }

  // ─── Plan non compatible ─────────────────────────────────────────────────────
  if (stats?.locked) {
    return (
      <Card className="p-4 border-dashed">
        <div className="flex items-center gap-3 text-text-muted">
          <Lock className="w-4 h-4 flex-shrink-0" />
          <p className="text-sm">
            Le tableau de bord Chorus Pro est disponible à partir du{" "}
            <span className="font-semibold text-primary">plan Pro</span>.
          </p>
        </div>
      </Card>
    );
  }

  // ─── Erreur fetch ────────────────────────────────────────────────────────────
  if (!stats) return null;

  // ─── Plan pro+ mais aucune facture Chorus encore ─────────────────────────────
  if (stats.total_chorus === 0) {
    return (
      <Card className="p-5 border-dashed">
        <div className="flex items-center gap-4">
          <div className="w-10 h-10 rounded-xl bg-status-info/10 flex items-center justify-center flex-shrink-0">
            <Zap className="w-5 h-5 text-status-info" />
          </div>
          <div>
            <p className="text-sm font-semibold text-text-primary">Chorus Pro activé</p>
            <p className="text-xs text-text-muted mt-0.5">
              Vos premières factures Chorus apparaîtront ici dès leur envoi.
              Cochez l&apos;option « Chorus Pro » sur une facture pour démarrer.
            </p>
          </div>
        </div>
      </Card>
    );
  }

  const formatEur = (n: number) =>
    n.toLocaleString("fr-FR", { maximumFractionDigits: 0 }) + " €";

  return (
    <Card className="p-0 overflow-hidden">
      {/* Header */}
      <div className="px-5 py-3.5 border-b border-surface-border flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-lg bg-status-info/10 flex items-center justify-center">
            <Building2 className="w-4 h-4 text-status-info" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-text-primary">Dashboard Chorus Pro</h3>
            <p className="text-xs text-text-muted">{stats.total_chorus} facture(s) Chorus</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {stats.queue_pending > 0 && (
            <span className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-status-warning/10 text-status-warning text-xs font-medium">
              <div className="w-1.5 h-1.5 rounded-full bg-status-warning animate-pulse" />
              {stats.queue_pending} en queue
            </span>
          )}
          <button
            onClick={() => {
              console.log("[ChorusDashboard] refresh click");
              fetchStats(true);
            }}
            disabled={refreshing}
            className="p-1.5 rounded-lg text-text-muted hover:text-text-primary hover:bg-surface-active transition-colors disabled:opacity-50"
            title="Actualiser les stats"
          >
            <RefreshCw className={clsx("w-3.5 h-3.5", refreshing && "animate-spin")} />
          </button>
        </div>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 divide-x divide-y md:divide-y-0 divide-surface-border">
        {/* Envoyées */}
        <div className="p-4">
          <div className="flex items-center gap-2 mb-1.5">
            <TrendingUp className="w-3.5 h-3.5 text-status-info" />
            <span className="text-xs text-text-muted font-medium uppercase tracking-wide">Envoyées</span>
          </div>
          <p className="text-xl font-bold font-mono text-text-primary">{stats.total_envoyes}</p>
          <p className="text-xs text-text-muted mt-0.5">{formatEur(stats.montant_total_envoye)}</p>
        </div>

        {/* Acceptées */}
        <div className="p-4">
          <div className="flex items-center gap-2 mb-1.5">
            <CheckCircle2 className="w-3.5 h-3.5 text-primary" />
            <span className="text-xs text-text-muted font-medium uppercase tracking-wide">Acceptées</span>
          </div>
          <p className="text-xl font-bold font-mono text-primary">{stats.total_acceptees}</p>
          <p className="text-xs text-text-muted mt-0.5">{formatEur(stats.montant_accepte)}</p>
        </div>

        {/* En attente */}
        <div className="p-4">
          <div className="flex items-center gap-2 mb-1.5">
            <Clock className="w-3.5 h-3.5 text-status-warning" />
            <span className="text-xs text-text-muted font-medium uppercase tracking-wide">En attente</span>
          </div>
          <p className="text-xl font-bold font-mono text-status-warning">{stats.total_en_attente}</p>
          <p className="text-xs text-text-muted mt-0.5">
            {stats.total_en_attente > 0 ? "polling auto actif" : "aucun dépôt en cours"}
          </p>
        </div>

        {/* Rejetées */}
        <div className="p-4">
          <div className="flex items-center gap-2 mb-1.5">
            <XCircle className="w-3.5 h-3.5 text-status-error" />
            <span className="text-xs text-text-muted font-medium uppercase tracking-wide">Rejetées</span>
          </div>
          <p className="text-xl font-bold font-mono text-status-error">{stats.total_rejetees}</p>
          <p className="text-xs text-text-muted mt-0.5">
            {stats.taux_rejet > 0 ? `${stats.taux_rejet}% des envois` : "aucun rejet"}
          </p>
        </div>
      </div>

      {/* Taux d'acceptation */}
      {stats.total_envoyes > 0 && (
        <div className="px-5 py-3 border-t border-surface-border">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-xs text-text-muted font-medium">Taux d'acceptation</span>
            <span className={clsx(
              "text-xs font-bold font-mono",
              stats.taux_acceptation >= 80
                ? "text-primary"
                : stats.taux_acceptation >= 50
                ? "text-status-warning"
                : "text-status-error",
            )}>
              {stats.taux_acceptation}%
            </span>
          </div>
          <div className="h-1.5 bg-surface-active rounded-full overflow-hidden">
            <div
              className={clsx(
                "h-full rounded-full transition-all duration-500",
                stats.taux_acceptation >= 80
                  ? "bg-primary"
                  : stats.taux_acceptation >= 50
                  ? "bg-status-warning"
                  : "bg-status-error",
              )}
              style={{ width: `${stats.taux_acceptation}%` }}
            />
          </div>
        </div>
      )}
    </Card>
  );
}
