"use client";

import { useState } from "react";
import {
  X, MapPin, Calendar, FileText,
  Plus, Trash2, CheckSquare, Square, StickyNote,
  TrendingUp, AlertTriangle, HardHat,
  Pencil, Check, Sparkles,
} from "lucide-react";
import { clsx } from "clsx";
import type { Chantier, ChantierStatus } from "@/lib/chantiers-types";
import Badge from "@/components/ui/Badge";
import { useAgent } from "@/components/agent/AgentContext";

interface ChantierDrawerProps {
  chantier: Chantier;
  onClose: () => void;
  onUpdate: (c: Chantier) => void;
}

type Tab = "détails" | "étapes" | "budget" | "notes";

const STATUS_BADGE: Record<ChantierStatus, "success" | "warning" | "info" | "default"> = {
  "en cours": "info",
  "terminé":  "success",
  "planifié": "warning",
  "suspendu": "default",
};

const CATEGORY_LABEL: Record<string, string> = {
  prep:     "Préparation",
  travaux:  "Travaux",
  finition: "Finition",
  admin:    "Administratif",
};

const CATEGORY_COLOR: Record<string, string> = {
  prep:     "text-status-info bg-status-info/10",
  travaux:  "text-status-warning bg-status-warning/10",
  finition: "text-primary bg-primary/10",
  admin:    "text-text-muted bg-surface-active",
};

function formatNoteDate(iso: string): string {
  return new Date(iso).toLocaleDateString("fr-FR", { day: "2-digit", month: "short", year: "numeric" });
}

export default function ChantierDrawer({ chantier, onClose, onUpdate }: ChantierDrawerProps) {
  const { openAgent } = useAgent();
  const [tab, setTab] = useState<Tab>("détails");
  const [addingNote, setAddingNote] = useState(false);
  const [newNote, setNewNote] = useState("");
  const [editingProgress, setEditingProgress] = useState(false);
  const [progressValue, setProgressValue] = useState(chantier.progression);

  const doneCount    = chantier.etapes.filter((e) => e.done).length;
  const totalEtapes  = chantier.etapes.length;
  const budget       = chantier.budget_prevu ?? 0;
  const reel         = chantier.budget_reel ?? 0;
  const budgetPct    = budget > 0 ? Math.round((reel / budget) * 100) : 0;
  const restant      = budget - reel;

  const toggleEtape = (id: string) => {
    const updatedEtapes = chantier.etapes.map((e) => e.id === id ? { ...e, done: !e.done } : e);
    const newDone = updatedEtapes.filter((e) => e.done).length;
    const pct = totalEtapes > 0 ? Math.round((newDone / totalEtapes) * 100) : 0;
    onUpdate({ ...chantier, etapes: updatedEtapes, progression: pct });
  };

  const handleAddNote = () => {
    if (!newNote.trim()) return;
    onUpdate({
      ...chantier,
      notes: [
        {
          id:         `n-${Date.now()}`,
          contenu:    newNote,
          created_at: new Date().toISOString(),
        },
        ...chantier.notes,
      ],
    });
    setNewNote("");
    setAddingNote(false);
  };

  const handleDeleteNote = (id: string) => {
    onUpdate({ ...chantier, notes: chantier.notes.filter((n) => n.id !== id) });
  };

  const handleSaveProgress = () => {
    onUpdate({ ...chantier, progression: progressValue });
    setEditingProgress(false);
  };

  const handleStatusChange = (status: ChantierStatus) => {
    onUpdate({ ...chantier, status });
  };

  const TABS: { id: Tab; label: string; count?: number }[] = [
    { id: "détails", label: "Détails" },
    { id: "étapes",  label: "Étapes",  count: totalEtapes },
    { id: "budget",  label: "Budget" },
    { id: "notes",   label: "Notes",   count: chantier.notes.length },
  ];

  return (
    <>
      <div className="fixed inset-0 z-40 bg-black/40 backdrop-blur-[2px]" onClick={onClose} />
      <div className="fixed top-0 right-0 bottom-0 z-50 w-full max-w-lg bg-background-secondary border-l border-surface-border shadow-card flex flex-col animate-slide-in">

        {/* Header */}
        <div className="px-5 py-5 border-b border-surface-border">
          <div className="flex items-start gap-3">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-status-info/20 to-status-info/5 border border-status-info/20 flex items-center justify-center flex-shrink-0">
              <HardHat className="w-6 h-6 text-status-info" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-lg font-bold text-text-primary truncate">{chantier.client}</h2>
                <Badge variant={STATUS_BADGE[chantier.status]} size="sm" dot>{chantier.status}</Badge>
              </div>
              <p className="text-sm text-text-muted">{chantier.titre}</p>
            </div>
            <button onClick={onClose} className="p-1.5 rounded-lg text-text-muted hover:text-text-primary hover:bg-surface-hover transition-colors">
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Progress bar */}
          <div className="mt-4">
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-xs text-text-muted font-medium">Avancement global</span>
              <div className="flex items-center gap-2">
                {editingProgress ? (
                  <div className="flex items-center gap-1">
                    <input
                      type="number"
                      min={0}
                      max={100}
                      value={progressValue}
                      onChange={(e) => setProgressValue(Number(e.target.value))}
                      className="input-field w-16 py-0.5 text-xs text-center font-mono"
                    />
                    <span className="text-xs text-text-muted">%</span>
                    <button onClick={handleSaveProgress} className="p-1 rounded bg-primary/10 text-primary hover:bg-primary/20 transition-colors">
                      <Check className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => { setEditingProgress(true); setProgressValue(chantier.progression); }}
                    className="flex items-center gap-1 text-xs font-bold text-text-primary hover:text-primary transition-colors group"
                  >
                    <span className="font-mono">{chantier.progression}%</span>
                    <Pencil className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                  </button>
                )}
              </div>
            </div>
            <div className="h-2 bg-surface-active rounded-full overflow-hidden">
              <div
                className={clsx(
                  "h-full rounded-full transition-all duration-500",
                  chantier.progression === 100 ? "bg-primary" : "bg-status-info"
                )}
                style={{ width: `${chantier.progression}%` }}
              />
            </div>
            <div className="flex justify-between text-[10px] text-text-muted mt-1">
              <span>{doneCount}/{totalEtapes} étapes</span>
              {budget > 0 && (
                <span>{reel.toLocaleString("fr-FR")} € / {budget.toLocaleString("fr-FR")} € budget</span>
              )}
            </div>
          </div>

          {/* Status changer + AI button */}
          <div className="flex gap-1 mt-3 items-center">
            {(["planifié", "en cours", "suspendu", "terminé"] as ChantierStatus[]).map((s) => (
              <button
                key={s}
                onClick={() => handleStatusChange(s)}
                className={clsx(
                  "px-2.5 py-1 rounded-lg text-[11px] font-medium transition-colors capitalize",
                  chantier.status === s
                    ? "bg-primary text-background"
                    : "text-text-muted hover:text-text-primary hover:bg-surface-hover"
                )}
              >
                {s}
              </button>
            ))}
            <button
              onClick={() => openAgent({
                type:  "chantier",
                label: `${chantier.client} — ${chantier.titre}`,
                data: {
                  id:          chantier.id,
                  client:      chantier.client,
                  titre:       chantier.titre,
                  status:      chantier.status,
                  progression: chantier.progression,
                  budget_prevu: chantier.budget_prevu,
                  budget_reel:  chantier.budget_reel,
                  date_debut:       chantier.date_debut,
                  date_fin_prevue:  chantier.date_fin_prevue,
                  description: chantier.description,
                  etapes: chantier.etapes.map((e) => ({ titre: e.titre, done: e.done, categorie: e.categorie, date_prevue: e.date_prevue })),
                  notes:  chantier.notes.map((n) => ({ contenu: n.contenu, created_at: n.created_at })),
                }
              })}
              className="ml-auto flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-primary/10 border border-primary/15 text-primary hover:bg-primary/20 transition-all text-[11px] font-semibold"
              title="Demander à l'IA"
            >
              <Sparkles className="w-3.5 h-3.5" />
              IA
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-surface-border px-5">
          {TABS.map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id as Tab)}
              className={clsx(
                "flex items-center gap-1.5 px-3 py-3 text-sm font-medium border-b-2 transition-colors -mb-px",
                tab === t.id ? "border-primary text-primary" : "border-transparent text-text-muted hover:text-text-primary"
              )}
            >
              {t.label}
              {t.count !== undefined && t.count > 0 && (
                <span className={clsx("text-[10px] font-bold px-1.5 py-0.5 rounded-full", tab === t.id ? "bg-primary/20 text-primary" : "bg-surface-active text-text-muted")}>
                  {t.count}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto">

          {/* ── DÉTAILS ── */}
          {tab === "détails" && (
            <div className="p-5 space-y-5 animate-fade-in">
              {chantier.description && (
                <div className="p-3 rounded-xl bg-background border border-surface-border">
                  <p className="text-[10px] font-semibold text-text-muted uppercase tracking-wider mb-1.5">Description</p>
                  <p className="text-sm text-text-secondary leading-relaxed">{chantier.description}</p>
                </div>
              )}

              <div className="space-y-1">
                <p className="text-[10px] font-semibold text-text-muted uppercase tracking-widest mb-2">Localisation & dates</p>
                {[
                  chantier.adresse_chantier ? { icon: MapPin, label: "Adresse", value: chantier.adresse_chantier } : null,
                  chantier.date_debut ? { icon: Calendar, label: "Début", value: new Date(chantier.date_debut).toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" }) } : null,
                  chantier.date_fin_prevue ? { icon: Calendar, label: "Fin prévue", value: new Date(chantier.date_fin_prevue).toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" }) } : null,
                  chantier.date_fin_reelle ? { icon: Calendar, label: "Fin réelle", value: new Date(chantier.date_fin_reelle).toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" }) } : null,
                ].filter(Boolean).map((row, i) => row && (
                  <div key={i} className="flex items-center gap-3 p-3 rounded-xl hover:bg-surface-hover transition-colors">
                    <row.icon className="w-4 h-4 text-text-muted flex-shrink-0" />
                    <div>
                      <p className="text-[10px] text-text-muted">{row.label}</p>
                      <p className="text-sm text-text-primary">{row.value}</p>
                    </div>
                  </div>
                ))}
                {!chantier.adresse_chantier && !chantier.date_debut && !chantier.date_fin_prevue && (
                  <div className="flex items-center gap-2 p-3 text-sm text-text-muted">
                    <FileText className="w-4 h-4 flex-shrink-0 opacity-50" />
                    <span>Aucune localisation ou date renseignée</span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ── ÉTAPES ── */}
          {tab === "étapes" && (
            <div className="p-5 space-y-2 animate-fade-in">
              <div className="flex items-center justify-between mb-3">
                <p className="text-sm font-semibold text-text-primary">
                  {doneCount}/{totalEtapes} étapes complètes
                </p>
                <span className="text-xs text-text-muted">{chantier.progression}% avancement</span>
              </div>

              {totalEtapes === 0 ? (
                <div className="py-12 text-center">
                  <CheckSquare className="w-10 h-10 mx-auto mb-3 text-text-muted opacity-30" />
                  <p className="text-sm text-text-muted">Aucune étape pour ce chantier</p>
                </div>
              ) : (
                (["prep", "travaux", "finition", "admin"] as const).map((cat) => {
                  const catEtapes = chantier.etapes.filter((e) => e.categorie === cat);
                  if (catEtapes.length === 0) return null;
                  const catDone = catEtapes.filter((e) => e.done).length;
                  return (
                    <div key={cat} className="mb-4">
                      <div className="flex items-center gap-2 mb-2">
                        <span className={clsx("text-[10px] font-bold px-2 py-0.5 rounded-full", CATEGORY_COLOR[cat])}>
                          {CATEGORY_LABEL[cat]}
                        </span>
                        <span className="text-[10px] text-text-muted">{catDone}/{catEtapes.length}</span>
                      </div>
                      <div className="space-y-1">
                        {catEtapes.map((etape) => (
                          <div
                            key={etape.id}
                            onClick={() => toggleEtape(etape.id)}
                            className={clsx(
                              "flex items-start gap-3 p-3 rounded-xl cursor-pointer transition-all",
                              etape.done ? "bg-primary/5 border border-primary/10" : "bg-background border border-surface-border hover:border-surface-active"
                            )}
                          >
                            <div className={clsx("flex-shrink-0 mt-0.5", etape.done ? "text-primary" : "text-text-muted")}>
                              {etape.done ? <CheckSquare className="w-4 h-4" /> : <Square className="w-4 h-4" />}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className={clsx("text-sm", etape.done ? "text-text-muted line-through" : "text-text-primary")}>
                                {etape.titre}
                              </p>
                              {etape.date_prevue && (
                                <span className="text-[10px] text-text-muted flex items-center gap-1 mt-0.5">
                                  <Calendar className="w-3 h-3" />
                                  {new Date(etape.date_prevue).toLocaleDateString("fr-FR", { day: "numeric", month: "short" })}
                                </span>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          )}

          {/* ── BUDGET ── */}
          {tab === "budget" && (
            <div className="p-5 space-y-5 animate-fade-in">
              {budget === 0 && reel === 0 ? (
                <div className="py-12 text-center">
                  <AlertTriangle className="w-10 h-10 mx-auto mb-3 text-text-muted opacity-30" />
                  <p className="text-sm text-text-muted">Aucun budget renseigné</p>
                </div>
              ) : (
                <>
                  {/* Summary */}
                  <div className="grid grid-cols-3 gap-3">
                    {[
                      { label: "Budget prévu",  value: `${budget.toLocaleString("fr-FR")} €`,   color: "text-text-primary" },
                      { label: "Budget réel",   value: `${reel.toLocaleString("fr-FR")} €`,     color: budgetPct > 90 ? "text-status-error" : "text-status-warning" },
                      { label: "Restant",       value: `${restant.toLocaleString("fr-FR")} €`,  color: restant < 0 ? "text-status-error" : "text-primary" },
                    ].map((k, i) => (
                      <div key={i} className="p-3 rounded-xl bg-background border border-surface-border text-center">
                        <p className={clsx("text-lg font-bold font-mono", k.color)}>{k.value}</p>
                        <p className="text-[10px] text-text-muted mt-0.5">{k.label}</p>
                      </div>
                    ))}
                  </div>

                  {/* Budget bar */}
                  {budget > 0 && (
                    <div>
                      <div className="flex justify-between text-xs mb-1.5">
                        <span className="text-text-muted">Consommation budget</span>
                        <span className={clsx("font-semibold", budgetPct > 90 ? "text-status-error" : "text-text-primary")}>
                          {budgetPct}%
                        </span>
                      </div>
                      <div className="h-3 bg-surface-active rounded-full overflow-hidden">
                        <div
                          className={clsx("h-full rounded-full transition-all", budgetPct > 100 ? "bg-status-error" : budgetPct > 80 ? "bg-status-warning" : "bg-primary")}
                          style={{ width: `${Math.min(100, budgetPct)}%` }}
                        />
                      </div>
                      {budgetPct > 90 && (
                        <p className="text-xs text-status-warning flex items-center gap-1 mt-1.5">
                          <AlertTriangle className="w-3.5 h-3.5" />
                          Budget presque épuisé — vérifiez les dépenses restantes
                        </p>
                      )}
                    </div>
                  )}
                </>
              )}
            </div>
          )}

          {/* ── NOTES ── */}
          {tab === "notes" && (
            <div className="p-5 space-y-3 animate-fade-in">
              <div className="flex items-center justify-between mb-1">
                <p className="text-sm font-semibold text-text-primary">Notes de chantier</p>
                <button
                  onClick={() => setAddingNote(true)}
                  className="flex items-center gap-1.5 text-xs text-primary font-semibold hover:text-primary-400 transition-colors"
                >
                  <Plus className="w-3.5 h-3.5" /> Ajouter
                </button>
              </div>

              {addingNote && (
                <div className="p-3 rounded-xl bg-primary/5 border border-primary/20 animate-fade-in">
                  <textarea
                    value={newNote}
                    onChange={(e) => setNewNote(e.target.value)}
                    placeholder="Observations, problèmes rencontrés, décisions prises…"
                    rows={3}
                    className="input-field w-full text-sm resize-none mb-2"
                    autoFocus
                  />
                  <div className="flex gap-2">
                    <button onClick={() => { setAddingNote(false); setNewNote(""); }} className="btn-ghost text-xs px-3 py-1.5 rounded-lg border border-surface-border">Annuler</button>
                    <button onClick={handleAddNote} disabled={!newNote.trim()} className="btn-primary text-xs px-3 py-1.5 disabled:opacity-50">Enregistrer</button>
                  </div>
                </div>
              )}

              {chantier.notes.length === 0 && !addingNote ? (
                <div className="py-12 text-center">
                  <StickyNote className="w-10 h-10 mx-auto mb-3 text-text-muted opacity-30" />
                  <p className="text-sm text-text-muted">Aucune note pour ce chantier</p>
                  <button onClick={() => setAddingNote(true)} className="mt-3 btn-primary text-sm px-4 py-2">
                    Ajouter une note
                  </button>
                </div>
              ) : (
                chantier.notes.map((note) => (
                  <div
                    key={note.id}
                    className="p-4 rounded-xl border group transition-colors bg-background border-surface-border hover:border-surface-active"
                  >
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <span className="text-xs text-text-muted">{formatNoteDate(note.created_at)}</span>
                      <button
                        onClick={() => handleDeleteNote(note.id)}
                        className="opacity-0 group-hover:opacity-100 p-1 rounded text-text-muted hover:text-status-error transition-all"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                    <p className="text-sm text-text-secondary leading-relaxed">{note.contenu}</p>
                  </div>
                ))
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-3 border-t border-surface-border flex items-center justify-between">
          <button className="flex items-center gap-1.5 text-xs text-text-muted hover:text-status-error hover:bg-status-error/10 px-3 py-1.5 rounded-lg transition-colors">
            <Trash2 className="w-3.5 h-3.5" /> Supprimer
          </button>
          <div className="flex gap-2">
            <button className="flex items-center gap-1.5 text-xs text-primary bg-primary/10 hover:bg-primary/20 px-3 py-1.5 rounded-lg font-semibold transition-colors">
              <TrendingUp className="w-3.5 h-3.5" /> Créer facture
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
