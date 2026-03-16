"use client";

import { useState } from "react";
import {
  X, MapPin, Calendar, Users, FileText, Receipt,
  Plus, Trash2, CheckSquare, Square, StickyNote,
  TrendingUp, AlertTriangle, ChevronRight, HardHat,
  Pencil, Check,
} from "lucide-react";
import { clsx } from "clsx";
import type { Chantier, ChantierStatus } from "@/lib/chantiers-data";
import Badge from "@/components/ui/Badge";

interface ChantierDrawerProps {
  chantier: Chantier;
  onClose: () => void;
  onUpdate: (c: Chantier) => void;
}

type Tab = "détails" | "étapes" | "budget" | "notes";

const STATUS_BADGE: Record<ChantierStatus, "success" | "warning" | "info" | "default"> = {
  "en cours": "info",
  "terminé": "success",
  "planifié": "warning",
  "en pause": "default",
};

const CATEGORY_LABEL: Record<string, string> = {
  prep: "Préparation",
  travaux: "Travaux",
  finition: "Finition",
  admin: "Administratif",
};

const CATEGORY_COLOR: Record<string, string> = {
  prep: "text-status-info bg-status-info/10",
  travaux: "text-status-warning bg-status-warning/10",
  finition: "text-primary bg-primary/10",
  admin: "text-text-muted bg-surface-active",
};

const DEP_CATEGORY: Record<string, string> = {
  materiau: "Matériaux",
  main_oeuvre: "Main-d'œuvre",
  sous_traitant: "Sous-traitant",
  autre: "Autre",
};

export default function ChantierDrawer({ chantier, onClose, onUpdate }: ChantierDrawerProps) {
  const [tab, setTab] = useState<Tab>("détails");
  const [addingNote, setAddingNote] = useState(false);
  const [newNote, setNewNote] = useState("");
  const [editingProgress, setEditingProgress] = useState(false);
  const [progressValue, setProgressValue] = useState(chantier.progression);

  const doneCount = chantier.etapes.filter((e) => e.done).length;
  const totalEtapes = chantier.etapes.length;
  const budgetPct = chantier.budget > 0 ? Math.round((chantier.depenses / chantier.budget) * 100) : 0;
  const restant = chantier.budget - chantier.depenses;

  const toggleEtape = (id: string) => {
    const updated = {
      ...chantier,
      etapes: chantier.etapes.map((e) => e.id === id ? { ...e, done: !e.done } : e),
    };
    // Auto-update progression based on done ratio
    const newDone = updated.etapes.filter((e) => e.done).length;
    const pct = totalEtapes > 0 ? Math.round((newDone / totalEtapes) * 100) : 0;
    onUpdate({ ...updated, progression: pct });
  };

  const handleAddNote = () => {
    if (!newNote.trim()) return;
    onUpdate({
      ...chantier,
      notes: [
        {
          id: `n-${Date.now()}`,
          content: newNote,
          date: new Date().toLocaleDateString("fr-FR", { day: "2-digit", month: "short", year: "numeric" }),
          author: "Jean Dupont",
          type: "info",
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
    { id: "étapes", label: "Étapes", count: totalEtapes },
    { id: "budget", label: "Budget" },
    { id: "notes", label: "Notes", count: chantier.notes.length },
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
              <p className="text-sm text-text-muted">{chantier.type}</p>
              <p className="font-mono text-xs text-text-muted mt-0.5">{chantier.id}</p>
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
              <span>{chantier.depenses.toLocaleString("fr-FR")} € / {chantier.budget.toLocaleString("fr-FR")} € budget</span>
            </div>
          </div>

          {/* Status changer */}
          <div className="flex gap-1 mt-3">
            {(["planifié", "en cours", "en pause", "terminé"] as ChantierStatus[]).map((s) => (
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
              <div className="p-3 rounded-xl bg-background border border-surface-border">
                <p className="text-[10px] font-semibold text-text-muted uppercase tracking-wider mb-1.5">Description</p>
                <p className="text-sm text-text-secondary leading-relaxed">{chantier.description}</p>
              </div>

              <div className="space-y-1">
                <p className="text-[10px] font-semibold text-text-muted uppercase tracking-widest mb-2">Localisation & dates</p>
                {[
                  { icon: MapPin, label: "Adresse", value: `${chantier.address}, ${chantier.city}` },
                  { icon: Calendar, label: "Début", value: new Date(chantier.startDate).toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" }) },
                  { icon: Calendar, label: "Fin prévue", value: new Date(chantier.endDate).toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" }) },
                  { icon: Users, label: "Équipe", value: chantier.team.join(", ") },
                ].map((row, i) => (
                  <div key={i} className="flex items-center gap-3 p-3 rounded-xl hover:bg-surface-hover transition-colors">
                    <row.icon className="w-4 h-4 text-text-muted flex-shrink-0" />
                    <div>
                      <p className="text-[10px] text-text-muted">{row.label}</p>
                      <p className="text-sm text-text-primary">{row.value}</p>
                    </div>
                  </div>
                ))}
              </div>

              {/* Linked documents */}
              {(chantier.devisId || chantier.factureId) && (
                <div className="space-y-1">
                  <p className="text-[10px] font-semibold text-text-muted uppercase tracking-widest mb-2">Documents liés</p>
                  {chantier.devisId && (
                    <div className="flex items-center gap-3 p-3 rounded-xl bg-background border border-surface-border hover:border-primary/20 transition-colors cursor-pointer group">
                      <FileText className="w-4 h-4 text-status-info flex-shrink-0" />
                      <div className="flex-1">
                        <p className="text-[10px] text-text-muted">Devis</p>
                        <p className="text-sm font-mono font-semibold text-text-primary">{chantier.devisId}</p>
                      </div>
                      <ChevronRight className="w-4 h-4 text-text-muted opacity-0 group-hover:opacity-100 transition-opacity" />
                    </div>
                  )}
                  {chantier.factureId && (
                    <div className="flex items-center gap-3 p-3 rounded-xl bg-background border border-surface-border hover:border-primary/20 transition-colors cursor-pointer group">
                      <Receipt className="w-4 h-4 text-primary flex-shrink-0" />
                      <div className="flex-1">
                        <p className="text-[10px] text-text-muted">Facture</p>
                        <p className="text-sm font-mono font-semibold text-text-primary">{chantier.factureId}</p>
                      </div>
                      <ChevronRight className="w-4 h-4 text-text-muted opacity-0 group-hover:opacity-100 transition-opacity" />
                    </div>
                  )}
                </div>
              )}
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

              {/* Group by category */}
              {(["prep", "travaux", "finition", "admin"] as const).map((cat) => {
                const catEtapes = chantier.etapes.filter((e) => e.category === cat);
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
                              {etape.label}
                            </p>
                            <div className="flex items-center gap-3 mt-0.5">
                              {etape.dueDate && (
                                <span className="text-[10px] text-text-muted flex items-center gap-1">
                                  <Calendar className="w-3 h-3" /> {etape.dueDate}
                                </span>
                              )}
                              {etape.assignee && (
                                <span className="text-[10px] text-text-muted flex items-center gap-1">
                                  <Users className="w-3 h-3" /> {etape.assignee}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* ── BUDGET ── */}
          {tab === "budget" && (
            <div className="p-5 space-y-5 animate-fade-in">
              {/* Summary */}
              <div className="grid grid-cols-3 gap-3">
                {[
                  { label: "Budget", value: `${chantier.budget.toLocaleString("fr-FR")} €`, color: "text-text-primary" },
                  { label: "Dépensé", value: `${chantier.depenses.toLocaleString("fr-FR")} €`, color: budgetPct > 90 ? "text-status-error" : "text-status-warning" },
                  { label: "Restant", value: `${restant.toLocaleString("fr-FR")} €`, color: restant < 0 ? "text-status-error" : "text-primary" },
                ].map((k, i) => (
                  <div key={i} className="p-3 rounded-xl bg-background border border-surface-border text-center">
                    <p className={clsx("text-lg font-bold font-mono", k.color)}>{k.value}</p>
                    <p className="text-[10px] text-text-muted mt-0.5">{k.label}</p>
                  </div>
                ))}
              </div>

              {/* Budget bar */}
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

              {/* Breakdown by category */}
              <div>
                <p className="text-[10px] font-semibold text-text-muted uppercase tracking-widest mb-3">Répartition par poste</p>
                {Object.entries(DEP_CATEGORY).map(([cat, label]) => {
                  const total = chantier.depensesList
                    .filter((d) => d.category === cat)
                    .reduce((s, d) => s + d.montant, 0);
                  if (total === 0) return null;
                  const pct = chantier.budget > 0 ? Math.round((total / chantier.budget) * 100) : 0;
                  return (
                    <div key={cat} className="flex items-center gap-3 mb-2">
                      <span className="text-xs text-text-muted w-28 flex-shrink-0">{label}</span>
                      <div className="flex-1 h-2 bg-surface-active rounded-full overflow-hidden">
                        <div className="h-full bg-primary/60 rounded-full" style={{ width: `${Math.min(100, pct)}%` }} />
                      </div>
                      <span className="text-xs font-mono font-semibold text-text-primary w-20 text-right flex-shrink-0">
                        {total.toLocaleString("fr-FR")} €
                      </span>
                    </div>
                  );
                })}
              </div>

              {/* Detail list */}
              {chantier.depensesList.length > 0 && (
                <div>
                  <p className="text-[10px] font-semibold text-text-muted uppercase tracking-widest mb-2">Détail des dépenses</p>
                  <div className="rounded-xl border border-surface-border overflow-hidden">
                    {chantier.depensesList.map((d, i) => (
                      <div key={d.id} className={clsx("flex items-center gap-3 px-4 py-3 text-sm", i > 0 && "border-t border-surface-border/50")}>
                        <div className="flex-1 min-w-0">
                          <p className="text-text-primary truncate">{d.label}</p>
                          <p className="text-xs text-text-muted">{d.date} · {DEP_CATEGORY[d.category]}</p>
                        </div>
                        <span className="font-mono font-semibold text-text-primary flex-shrink-0">
                          {d.montant.toLocaleString("fr-FR")} €
                        </span>
                      </div>
                    ))}
                    <div className="flex items-center justify-between px-4 py-3 bg-surface/50 border-t border-surface-border">
                      <span className="text-xs font-semibold text-text-muted">Total dépensé</span>
                      <span className="font-mono font-bold text-text-primary">
                        {chantier.depenses.toLocaleString("fr-FR")} €
                      </span>
                    </div>
                  </div>
                </div>
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
                    className={clsx(
                      "p-4 rounded-xl border group transition-colors",
                      note.type === "warning"
                        ? "bg-status-warning/5 border-status-warning/20"
                        : "bg-background border-surface-border hover:border-surface-active"
                    )}
                  >
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <div className="flex items-center gap-2">
                        {note.type === "warning" && <AlertTriangle className="w-3.5 h-3.5 text-status-warning flex-shrink-0" />}
                        <div className="w-5 h-5 rounded-full bg-primary/10 flex items-center justify-center">
                          <span className="text-[8px] font-bold text-primary">JD</span>
                        </div>
                        <span className="text-xs font-semibold text-text-secondary">{note.author}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <span className="text-xs text-text-muted">{note.date}</span>
                        <button onClick={() => handleDeleteNote(note.id)} className="opacity-0 group-hover:opacity-100 p-1 rounded text-text-muted hover:text-status-error transition-all">
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                    <p className="text-sm text-text-secondary leading-relaxed">{note.content}</p>
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
