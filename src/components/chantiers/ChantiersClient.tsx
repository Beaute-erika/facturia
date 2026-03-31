"use client";

import { useState, useEffect } from "react";
import {
  Plus, MapPin, Calendar, Users, LayoutGrid,
  CalendarDays, Clock, CheckCircle2, PauseCircle,
  Search, HardHat, Euro, Archive, ArchiveRestore,
} from "lucide-react";
import { clsx } from "clsx";
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import Badge from "@/components/ui/Badge";
import PlanningView from "./PlanningView";
import ChantierDrawer from "./ChantierDrawer";
import type { Chantier, ChantierStatus } from "@/lib/chantiers-types";

type ViewMode = "cards" | "planning";
type Filter = "Tous" | ChantierStatus;
type ArchiveView = "actifs" | "archivés";

const STATUS_BADGE: Record<ChantierStatus, "success" | "warning" | "info" | "default"> = {
  "en cours": "info",
  "terminé":  "success",
  "planifié": "warning",
  "suspendu": "default",
};

const PROGRESS_COLOR = (pct: number) =>
  pct === 100 ? "bg-primary" : pct > 75 ? "bg-status-info" : pct > 40 ? "bg-status-info/80" : "bg-status-warning";

export default function ChantiersClient() {
  const [chantiers,    setChantiers]    = useState<Chantier[]>([]);
  const [loading,      setLoading]      = useState(true);
  const [error,        setError]        = useState<string | null>(null);
  const [view,         setView]         = useState<ViewMode>("cards");
  const [archiveView,  setArchiveView]  = useState<ArchiveView>("actifs");
  const [filter,       setFilter]       = useState<Filter>("Tous");
  const [search,       setSearch]       = useState("");
  const [selected,     setSelected]     = useState<Chantier | null>(null);
  const [toast,        setToast]        = useState<{ msg: string; error?: boolean } | null>(null);

  const showToast = (msg: string, isError = false) => {
    setToast({ msg, error: isError });
    setTimeout(() => setToast(null), isError ? 5000 : 3000);
  };

  useEffect(() => {
    setLoading(true);
    setError(null);
    const url = archiveView === "archivés" ? "/api/chantiers?archived=true" : "/api/chantiers";
    fetch(url)
      .then((r) => r.json())
      .then((data) => {
        if (data.error) throw new Error(data.error);
        setChantiers(data.chantiers ?? []);
      })
      .catch((e: unknown) => setError(e instanceof Error ? e.message : "Erreur chargement"))
      .finally(() => setLoading(false));
  }, [archiveView]);

  const handleUpdate = async (updated: Chantier) => {
    // Optimistic update
    setChantiers((prev) => prev.map((c) => c.id === updated.id ? updated : c));
    setSelected(updated);

    try {
      const resp = await fetch(`/api/chantiers/${updated.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          statut:      updated.status,
          progression: updated.progression,
          etapes:      updated.etapes,
          notes:       updated.notes,
        }),
      });
      if (!resp.ok) {
        showToast("Erreur lors de la sauvegarde");
      } else {
        showToast("Chantier mis à jour");
      }
    } catch {
      showToast("Erreur réseau");
    }
  };

  const handleArchive = async (chantier: Chantier, archive = true) => {
    try {
      const res = await fetch(`/api/chantiers/${chantier.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ archived: archive }),
      });
      if (!res.ok) {
        showToast("Erreur lors de l'archivage", true);
        return;
      }
      setChantiers((prev) => prev.filter((c) => c.id !== chantier.id));
      if (selected?.id === chantier.id) setSelected(null);
      showToast(archive ? "Chantier archivé" : "Chantier restauré");
    } catch {
      showToast("Impossible de joindre le serveur", true);
    }
  };

  const filtered = chantiers.filter((c) => {
    const statusMatch = filter === "Tous" || c.status === filter;
    const q = search.toLowerCase();
    const searchMatch = !search ||
      c.client.toLowerCase().includes(q) ||
      c.titre.toLowerCase().includes(q) ||
      (c.adresse_chantier ?? "").toLowerCase().includes(q);
    return statusMatch && searchMatch;
  });

  // KPIs
  const enCours   = chantiers.filter((c) => c.status === "en cours").length;
  const planifies = chantiers.filter((c) => c.status === "planifié").length;
  const termines  = chantiers.filter((c) => c.status === "terminé").length;
  const budgetActif = chantiers
    .filter((c) => c.status !== "terminé")
    .reduce((s, c) => s + (c.budget_prevu ?? 0), 0);
  const avgProgress = enCours > 0
    ? Math.round(chantiers.filter((c) => c.status === "en cours").reduce((s, c) => s + c.progression, 0) / enCours)
    : 0;

  const FILTERS: { id: Filter; label: string; icon: React.ElementType }[] = [
    { id: "Tous",      label: "Tous",      icon: HardHat },
    { id: "en cours",  label: "En cours",  icon: Clock },
    { id: "planifié",  label: "Planifiés", icon: CalendarDays },
    { id: "terminé",   label: "Terminés",  icon: CheckCircle2 },
    { id: "suspendu",  label: "Suspendus", icon: PauseCircle },
  ];

  if (loading) {
    return (
      <div className="space-y-6 animate-fade-in">
        <div className="h-8 w-48 bg-surface-active rounded-lg animate-pulse" />
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => <div key={i} className="h-24 bg-surface-active rounded-2xl animate-pulse" />)}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {[...Array(4)].map((_, i) => <div key={i} className="h-44 bg-surface-active rounded-2xl animate-pulse" />)}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="py-20 text-center">
        <HardHat className="w-12 h-12 mx-auto mb-4 text-text-muted opacity-30" />
        <p className="text-text-muted mb-4">{error}</p>
        <Button variant="secondary" onClick={() => window.location.reload()}>Réessayer</Button>
      </div>
    );
  }

  return (
    <>
      {toast && (
        <div className={clsx(
          "fixed bottom-6 right-6 z-50 flex items-center gap-3 px-4 py-3 rounded-xl shadow-card animate-fade-in",
          toast.error
            ? "bg-status-error/10 border border-status-error/30 text-status-error"
            : "bg-primary/10 border border-primary/30 text-primary"
        )}>
          {!toast.error && <CheckCircle2 className="w-4 h-4 flex-shrink-0" />}
          <span className="text-sm font-medium">{toast.msg}</span>
        </div>
      )}

      {selected && (
        <ChantierDrawer
          chantier={selected}
          onClose={() => setSelected(null)}
          onUpdate={handleUpdate}
        />
      )}

      <div className="space-y-6 animate-fade-in">
        {/* Header */}
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-bold text-text-primary">Chantiers</h1>
            <p className="text-text-muted mt-1">
              {archiveView === "archivés"
                ? `${chantiers.length} chantier(s) archivé(s)`
                : <>{enCours} en cours • <span className="text-primary font-medium">{budgetActif.toLocaleString("fr-FR")} € budget actif</span></>
              }
            </p>
          </div>
          <div className="flex gap-2">
            {/* Archive view toggle */}
            <div className="flex bg-surface border border-surface-border rounded-xl p-1 gap-1">
              {(["actifs", "archivés"] as ArchiveView[]).map((v) => (
                <button
                  key={v}
                  onClick={() => { setArchiveView(v); setFilter("Tous"); setSearch(""); }}
                  className={clsx(
                    "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all capitalize",
                    archiveView === v ? "bg-primary text-background shadow-glow" : "text-text-muted hover:text-text-primary"
                  )}
                >
                  {v === "archivés" && <Archive className="w-3 h-3" />}
                  {v.charAt(0).toUpperCase() + v.slice(1)}
                </button>
              ))}
            </div>
            {/* View mode toggle (cards / planning) — actifs seulement */}
            {archiveView === "actifs" && (
              <div className="flex bg-surface border border-surface-border rounded-xl p-1 gap-1">
                {([
                  { id: "cards" as ViewMode, icon: LayoutGrid, label: "Cartes" },
                  { id: "planning" as ViewMode, icon: CalendarDays, label: "Planning" },
                ]).map((v) => (
                  <button
                    key={v.id}
                    onClick={() => setView(v.id)}
                    title={v.label}
                    className={clsx(
                      "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all",
                      view === v.id ? "bg-primary text-background shadow-glow" : "text-text-muted hover:text-text-primary"
                    )}
                  >
                    <v.icon className="w-3.5 h-3.5" />
                    <span className="hidden sm:inline">{v.label}</span>
                  </button>
                ))}
              </div>
            )}
            {archiveView === "actifs" && (
              <Button variant="primary" icon={Plus}>Nouveau chantier</Button>
            )}
          </div>
        </div>

        {/* KPIs */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { label: "En cours",    value: String(enCours),   icon: Clock,         color: "text-status-info",    bg: "bg-status-info/10" },
            { label: "Planifiés",   value: String(planifies), icon: CalendarDays,  color: "text-status-warning", bg: "bg-status-warning/10" },
            { label: "Terminés",    value: String(termines),  icon: CheckCircle2,  color: "text-primary",        bg: "bg-primary/10" },
            { label: "Budget actif", value: `${budgetActif.toLocaleString("fr-FR")} €`, icon: Euro, color: "text-text-primary", bg: "bg-surface-active" },
          ].map((k, i) => (
            <Card key={i} className="py-4">
              <div className={clsx("w-9 h-9 rounded-xl flex items-center justify-center mb-3", k.bg)}>
                <k.icon className={clsx("w-5 h-5", k.color)} />
              </div>
              <p className={clsx("text-2xl font-bold font-mono", k.color)}>{k.value}</p>
              <p className="text-text-muted text-sm mt-1">{k.label}</p>
            </Card>
          ))}
        </div>

        {/* Average progress bar for "en cours" */}
        {enCours > 0 && (
          <Card className="py-3 px-5">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <Users className="w-4 h-4 text-text-muted" />
                <span className="text-sm text-text-secondary">Avancement moyen (chantiers en cours)</span>
              </div>
              <div className="flex-1 h-2 bg-surface-active rounded-full overflow-hidden">
                <div className="h-full bg-status-info rounded-full transition-all" style={{ width: `${avgProgress}%` }} />
              </div>
              <span className="text-sm font-bold font-mono text-text-primary w-10 text-right flex-shrink-0">{avgProgress}%</span>
            </div>
          </Card>
        )}

        {/* Filter + search bar */}
        <div className="flex items-center gap-3 flex-wrap">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-text-muted" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Client, titre, adresse…"
              className="input-field pl-8 py-1.5 text-sm w-52"
            />
          </div>
          <div className="flex gap-1 flex-wrap">
            {FILTERS.map((f) => {
              const Icon = f.icon;
              return (
                <button
                  key={f.id}
                  onClick={() => setFilter(f.id)}
                  className={clsx(
                    "flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium transition-colors",
                    filter === f.id
                      ? "bg-primary/10 text-primary border border-primary/20"
                      : "text-text-muted hover:text-text-primary hover:bg-surface-hover border border-transparent"
                  )}
                >
                  <Icon className="w-3.5 h-3.5" />
                  {f.label}
                  <span className={clsx(
                    "text-[10px] font-bold px-1.5 py-0.5 rounded-full",
                    filter === f.id ? "bg-primary/20 text-primary" : "bg-surface-active text-text-muted"
                  )}>
                    {f.id === "Tous" ? chantiers.length : chantiers.filter((c) => c.status === f.id).length}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Planning view */}
        {view === "planning" && (
          <PlanningView
            chantiers={filtered}
            onSelect={setSelected}
            selected={selected?.id ?? null}
          />
        )}

        {/* Cards view */}
        {view === "cards" && (
          <>
            {filtered.length === 0 ? (
              <div className="py-20 text-center">
                <HardHat className="w-12 h-12 mx-auto mb-4 text-text-muted opacity-30" />
                <p className="text-text-muted">
                  {chantiers.length === 0 ? "Aucun chantier — créez votre premier chantier" : "Aucun chantier trouvé"}
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {filtered.map((c) => {
                  const doneEtapes = c.etapes.filter((e) => e.done).length;
                  const budget    = c.budget_prevu ?? 0;
                  const depenses  = c.budget_reel ?? 0;
                  const budgetPct = budget > 0 ? Math.round((depenses / budget) * 100) : 0;
                  const isSelected = selected?.id === c.id;

                  return (
                    <div
                      key={c.id}
                      onClick={() => setSelected(c)}
                      className={clsx(
                        "glass-card p-5 cursor-pointer transition-all duration-200 hover:border-primary/30 group",
                        isSelected && "border-primary/40 shadow-glow"
                      )}
                    >
                      {/* Card header */}
                      <div className="flex items-start justify-between mb-4">
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2 mb-1 flex-wrap">
                            <Badge variant={STATUS_BADGE[c.status]} size="sm" dot>{c.status}</Badge>
                            {c.etapes.length > 0 && (
                              <span className="text-[10px] text-text-muted bg-surface-active px-1.5 py-0.5 rounded-md">
                                {doneEtapes}/{c.etapes.length} étapes
                              </span>
                            )}
                          </div>
                          <h3 className="font-semibold text-text-primary">{c.client}</h3>
                          <p className="text-sm text-text-muted">{c.titre}</p>
                        </div>
                        <div className="flex flex-col items-end gap-1.5 flex-shrink-0 ml-3">
                          {budget > 0 && (
                            <p className="text-base font-bold font-mono text-text-primary">
                              {budget.toLocaleString("fr-FR")} €
                            </p>
                          )}
                          {depenses > 0 && (
                            <p className={clsx("text-xs font-mono", budgetPct > 80 ? "text-status-error" : "text-text-muted")}>
                              {depenses.toLocaleString("fr-FR")} € réel
                            </p>
                          )}
                          {/* Archive / Restore */}
                          <button
                            onClick={(e) => { e.stopPropagation(); handleArchive(c, !c.archived); }}
                            title={c.archived ? "Restaurer le chantier" : "Archiver le chantier"}
                            className={clsx(
                              "flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-medium transition-colors opacity-0 group-hover:opacity-100",
                              c.archived
                                ? "text-status-success hover:bg-status-success/10"
                                : "text-text-muted hover:text-text-secondary hover:bg-surface-hover"
                            )}
                          >
                            {c.archived
                              ? <><ArchiveRestore className="w-3 h-3" /> Restaurer</>
                              : <><Archive className="w-3 h-3" /> Archiver</>
                            }
                          </button>
                        </div>
                      </div>

                      {/* Meta */}
                      <div className="space-y-1.5 mb-4 text-sm text-text-muted">
                        {c.adresse_chantier && (
                          <div className="flex items-center gap-2">
                            <MapPin className="w-3.5 h-3.5 flex-shrink-0" />
                            <span className="truncate">{c.adresse_chantier}</span>
                          </div>
                        )}
                        {(c.date_debut || c.date_fin_prevue) && (
                          <div className="flex items-center gap-1.5">
                            <Calendar className="w-3.5 h-3.5 flex-shrink-0" />
                            <span>
                              {c.date_debut
                                ? new Date(c.date_debut).toLocaleDateString("fr-FR", { day: "numeric", month: "short" })
                                : "—"}
                              {" — "}
                              {c.date_fin_prevue
                                ? new Date(c.date_fin_prevue).toLocaleDateString("fr-FR", { day: "numeric", month: "short" })
                                : "—"}
                            </span>
                          </div>
                        )}
                      </div>

                      {/* Progress */}
                      <div>
                        <div className="flex justify-between text-xs mb-1.5">
                          <span className="text-text-muted">Avancement</span>
                          <span className={clsx("font-semibold", c.progression === 100 ? "text-primary" : "text-text-primary")}>
                            {c.progression}%
                          </span>
                        </div>
                        <div className="h-1.5 bg-surface-active rounded-full overflow-hidden">
                          <div
                            className={clsx("h-full rounded-full transition-all duration-500", PROGRESS_COLOR(c.progression))}
                            style={{ width: `${c.progression}%` }}
                          />
                        </div>

                        {/* Budget mini bar */}
                        {depenses > 0 && budget > 0 && (
                          <div className="mt-2">
                            <div className="flex justify-between text-[10px] text-text-muted mb-1">
                              <span>Budget consommé</span>
                              <span className={budgetPct > 80 ? "text-status-warning font-semibold" : ""}>{budgetPct}%</span>
                            </div>
                            <div className="h-1 bg-surface-active rounded-full overflow-hidden">
                              <div
                                className={clsx("h-full rounded-full", budgetPct > 90 ? "bg-status-error" : budgetPct > 75 ? "bg-status-warning" : "bg-surface-border")}
                                style={{ width: `${Math.min(100, budgetPct)}%` }}
                              />
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </>
        )}
      </div>
    </>
  );
}
