"use client";

import { useState, useEffect, useMemo } from "react";
import {
  Plus, Search, Wallet, CheckCircle2, Clock, RefreshCw,
  Pencil, Trash2, AlertCircle, Euro, ChevronDown,
} from "lucide-react";
import { clsx } from "clsx";
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import Badge from "@/components/ui/Badge";
import ExpenseModal from "./ExpenseModal";
import type { Expense, ExpenseInput } from "@/lib/expenses-types";
import {
  EXPENSE_CATEGORIES,
  EXPENSE_STATUS,
  getCategoryLabel,
  getCategoryColor,
} from "@/lib/expenses-types";

// ─── Types locaux ─────────────────────────────────────────────────────────────

type PeriodFilter  = "all" | "month" | "quarter" | "year";
type StatusFilter  = "all" | "paid" | "pending" | "reimbursed";
type CategoryFilter = "all" | string;

const PERIOD_LABELS: Record<PeriodFilter, string> = {
  all:     "Tout",
  month:   "Ce mois",
  quarter: "3 mois",
  year:    "Cette année",
};

// ─── Helpers ─────────────────────────────────────────────────────────────────

function matchesPeriod(expense: Expense, period: PeriodFilter): boolean {
  if (period === "all") return true;
  const d   = new Date(expense.expense_date);
  const now = new Date();
  if (period === "month")   return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth();
  if (period === "quarter") return d >= new Date(now.getFullYear(), now.getMonth() - 2, 1);
  if (period === "year")    return d.getFullYear() === now.getFullYear();
  return true;
}

function formatAmount(n: number): string {
  return n.toLocaleString("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + " €";
}

function formatDate(iso: string): string {
  return new Date(iso + "T00:00:00").toLocaleDateString("fr-FR", {
    day: "2-digit", month: "short", year: "numeric",
  });
}

// ─── Component ───────────────────────────────────────────────────────────────

export default function ExpensesClient() {
  // ── Data ────────────────────────────────────────────────────────────────────
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [loading,  setLoading]  = useState(true);
  const [error,    setError]    = useState<string | null>(null);

  // ── Filtres ─────────────────────────────────────────────────────────────────
  const [search,   setSearch]   = useState("");
  const [period,   setPeriod]   = useState<PeriodFilter>("all");
  const [status,   setStatus]   = useState<StatusFilter>("all");
  const [category, setCategory] = useState<CategoryFilter>("all");

  // ── UI state ─────────────────────────────────────────────────────────────────
  const [showModal,       setShowModal]       = useState(false);
  const [editingExpense,  setEditingExpense]  = useState<Expense | null>(null);
  const [confirmDelete,   setConfirmDelete]   = useState<string | null>(null);
  const [toast,           setToast]           = useState<string | null>(null);

  // ── Fetch ────────────────────────────────────────────────────────────────────
  useEffect(() => {
    fetch("/api/expenses")
      .then((r) => r.json())
      .then((data: { expenses?: Expense[]; error?: string }) => {
        if (data.error) throw new Error(data.error);
        setExpenses(data.expenses ?? []);
      })
      .catch((e: unknown) => setError(e instanceof Error ? e.message : "Erreur de chargement"))
      .finally(() => setLoading(false));
  }, []);

  // ── Toast ────────────────────────────────────────────────────────────────────
  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3000);
  };

  // ── CRUD ─────────────────────────────────────────────────────────────────────
  const handleSave = async (input: ExpenseInput, id?: string) => {
    if (id) {
      // Édition
      const resp = await fetch(`/api/expenses/${id}`, {
        method:  "PATCH",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify(input),
      });
      const data = await resp.json() as { expense?: Expense; error?: string };
      if (!resp.ok) throw new Error(data.error ?? "Erreur serveur");
      setExpenses((prev) => prev.map((e) => e.id === id ? data.expense! : e));
      showToast("Frais mis à jour");
    } else {
      // Création
      const resp = await fetch("/api/expenses", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify(input),
      });
      const data = await resp.json() as { expense?: Expense; error?: string };
      if (!resp.ok) throw new Error(data.error ?? "Erreur serveur");
      setExpenses((prev) => [data.expense!, ...prev]);
      showToast("Frais créé");
    }
    setShowModal(false);
    setEditingExpense(null);
  };

  const handleDelete = async (id: string) => {
    const resp = await fetch(`/api/expenses/${id}`, { method: "DELETE" });
    if (!resp.ok) { showToast("Erreur lors de la suppression"); return; }
    setExpenses((prev) => prev.filter((e) => e.id !== id));
    setConfirmDelete(null);
    showToast("Frais supprimé");
  };

  const openEdit = (expense: Expense) => {
    setEditingExpense(expense);
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setEditingExpense(null);
  };

  // ── Filtrage ─────────────────────────────────────────────────────────────────
  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return expenses.filter((e) => {
      if (!matchesPeriod(e, period))                           return false;
      if (status !== "all"   && e.status   !== status)         return false;
      if (category !== "all" && e.category !== category)       return false;
      if (q && !e.title.toLowerCase().includes(q) && !getCategoryLabel(e.category).toLowerCase().includes(q)) return false;
      return true;
    });
  }, [expenses, search, period, status, category]);

  // ── KPIs (sur les données filtrées) ──────────────────────────────────────────
  const kpis = useMemo(() => {
    const total    = filtered.reduce((s, e) => s + e.amount, 0);
    const pending  = filtered.filter((e) => e.status === "pending");
    const reimbursed = filtered.filter((e) => e.status === "reimbursed");
    return { total, count: filtered.length, pendingCount: pending.length, pendingSum: pending.reduce((s, e) => s + e.amount, 0), reimbursedSum: reimbursed.reduce((s, e) => s + e.amount, 0) };
  }, [filtered]);

  // ── Rendu ─────────────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="space-y-6 animate-fade-in">
        <div className="h-8 w-32 bg-surface-active rounded-lg animate-pulse" />
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => <div key={i} className="h-24 bg-surface-active rounded-2xl animate-pulse" />)}
        </div>
        <div className="h-64 bg-surface-active rounded-2xl animate-pulse" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="py-20 text-center">
        <AlertCircle className="w-12 h-12 mx-auto mb-4 text-status-error opacity-50" />
        <p className="text-text-muted mb-4">{error}</p>
        <Button variant="secondary" onClick={() => window.location.reload()}>Réessayer</Button>
      </div>
    );
  }

  return (
    <>
      {/* Toast */}
      {toast && (
        <div className="fixed bottom-6 right-6 z-50 flex items-center gap-3 px-4 py-3 rounded-xl bg-primary/10 border border-primary/30 text-primary shadow-card animate-fade-in">
          <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
          <span className="text-sm font-medium">{toast}</span>
        </div>
      )}

      {/* Modal création / édition */}
      {showModal && (
        <ExpenseModal
          expense={editingExpense}
          onClose={closeModal}
          onSave={handleSave}
        />
      )}

      <div className="space-y-6 animate-fade-in">

        {/* ── En-tête ── */}
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-bold text-text-primary">Frais</h1>
            <p className="text-text-muted mt-1">
              {expenses.length} frais enregistré{expenses.length !== 1 ? "s" : ""} •{" "}
              <span className="text-primary font-medium">
                {formatAmount(expenses.reduce((s, e) => s + e.amount, 0))} total
              </span>
            </p>
          </div>
          <Button
            variant="primary"
            icon={Plus}
            onClick={() => { setEditingExpense(null); setShowModal(true); }}
          >
            Nouveau frais
          </Button>
        </div>

        {/* ── KPIs ── */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            {
              label: "Total période",
              value: formatAmount(kpis.total),
              icon:  Euro,
              color: "text-text-primary",
              bg:    "bg-surface-active",
              sub:   `${kpis.count} frais`,
            },
            {
              label: "Payés",
              value: formatAmount(filtered.filter((e) => e.status === "paid").reduce((s, e) => s + e.amount, 0)),
              icon:  CheckCircle2,
              color: "text-status-success",
              bg:    "bg-status-success/10",
              sub:   `${filtered.filter((e) => e.status === "paid").length} frais`,
            },
            {
              label: "En attente",
              value: String(kpis.pendingCount),
              icon:  Clock,
              color: "text-status-warning",
              bg:    "bg-status-warning/10",
              sub:   kpis.pendingCount > 0 ? formatAmount(kpis.pendingSum) : "Aucun",
            },
            {
              label: "Remboursés",
              value: formatAmount(kpis.reimbursedSum),
              icon:  RefreshCw,
              color: "text-status-info",
              bg:    "bg-status-info/10",
              sub:   `${filtered.filter((e) => e.status === "reimbursed").length} frais`,
            },
          ].map((k, i) => (
            <Card key={i} className="py-4">
              <div className={clsx("w-9 h-9 rounded-xl flex items-center justify-center mb-3", k.bg)}>
                <k.icon className={clsx("w-5 h-5", k.color)} />
              </div>
              <p className={clsx("text-xl font-bold font-mono truncate", k.color)}>{k.value}</p>
              <p className="text-text-muted text-sm mt-0.5">{k.label}</p>
              <p className="text-text-muted text-[11px] mt-0.5">{k.sub}</p>
            </Card>
          ))}
        </div>

        {/* ── Filtres ── */}
        <div className="space-y-3">
          {/* Période — tabs */}
          <div className="flex gap-1 p-1 bg-surface border border-surface-border rounded-xl w-fit">
            {(Object.entries(PERIOD_LABELS) as [PeriodFilter, string][]).map(([key, label]) => (
              <button
                key={key}
                onClick={() => setPeriod(key)}
                className={clsx(
                  "px-3 py-1.5 rounded-lg text-xs font-medium transition-all",
                  period === key
                    ? "bg-primary text-background shadow-glow"
                    : "text-text-muted hover:text-text-primary"
                )}
              >
                {label}
              </button>
            ))}
          </div>

          {/* Recherche + filtres secondaires */}
          <div className="flex items-center gap-3 flex-wrap">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-text-muted" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Rechercher un frais…"
                className="input-field pl-8 py-1.5 text-sm w-52"
              />
            </div>

            {/* Filtre statut */}
            <div className="relative">
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as StatusFilter)}
                className="input-field py-1.5 text-sm pr-8 appearance-none"
              >
                <option value="all">Tous les statuts</option>
                {(Object.entries(EXPENSE_STATUS) as [string, { label: string }][]).map(([k, v]) => (
                  <option key={k} value={k}>{v.label}</option>
                ))}
              </select>
              <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3 h-3 text-text-muted pointer-events-none" />
            </div>

            {/* Filtre catégorie */}
            <div className="relative">
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="input-field py-1.5 text-sm pr-8 appearance-none"
              >
                <option value="all">Toutes les catégories</option>
                {EXPENSE_CATEGORIES.map((c) => (
                  <option key={c.id} value={c.id}>{c.label}</option>
                ))}
              </select>
              <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3 h-3 text-text-muted pointer-events-none" />
            </div>

            {/* Compteur résultats */}
            {(search || status !== "all" || category !== "all") && (
              <span className="text-xs text-text-muted">
                {filtered.length} résultat{filtered.length !== 1 ? "s" : ""}
              </span>
            )}
          </div>
        </div>

        {/* ── Tableau ── */}
        {expenses.length === 0 ? (
          /* État vide global */
          <div className="py-24 text-center">
            <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-surface-active flex items-center justify-center">
              <Wallet className="w-8 h-8 text-text-muted opacity-50" />
            </div>
            <p className="text-text-primary font-semibold mb-1">Aucun frais enregistré</p>
            <p className="text-text-muted text-sm mb-6">Ajoutez votre premier frais pour commencer à suivre vos dépenses.</p>
            <Button
              variant="primary"
              icon={Plus}
              onClick={() => { setEditingExpense(null); setShowModal(true); }}
            >
              Ajouter un frais
            </Button>
          </div>
        ) : filtered.length === 0 ? (
          /* État vide après filtre */
          <div className="py-16 text-center glass-card">
            <Search className="w-10 h-10 mx-auto mb-3 text-text-muted opacity-30" />
            <p className="text-text-muted">Aucun frais ne correspond aux filtres sélectionnés</p>
            <button
              onClick={() => { setSearch(""); setStatus("all"); setCategory("all"); setPeriod("all"); }}
              className="mt-3 text-xs text-primary hover:underline"
            >
              Réinitialiser les filtres
            </button>
          </div>
        ) : (
          <div className="glass-card overflow-hidden p-0">
            {/* Résumé total en-tête tableau */}
            <div className="px-5 py-3 border-b border-surface-border flex items-center justify-between">
              <p className="text-xs text-text-muted">
                {filtered.length} frais affiché{filtered.length !== 1 ? "s" : ""}
              </p>
              <p className="text-sm font-bold font-mono text-text-primary">
                Total : {formatAmount(kpis.total)}
              </p>
            </div>

            {/* Table desktop */}
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-surface-border/50">
                    {["Nom", "Catégorie", "Date", "Montant", "Statut", ""].map((h, i) => (
                      <th
                        key={i}
                        className={clsx(
                          "px-5 py-3 text-[11px] font-semibold text-text-muted uppercase tracking-wider text-left",
                          i === 3 && "text-right",
                          i === 5 && "w-16"
                        )}
                      >
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((expense) => {
                    const statusCfg = EXPENSE_STATUS[expense.status] ?? { label: expense.status, badge: "default" as const };
                    const isConfirmingDelete = confirmDelete === expense.id;

                    return (
                      <tr
                        key={expense.id}
                        className="border-b border-surface-border/30 last:border-0 hover:bg-surface-hover/40 transition-colors group"
                      >
                        {/* Nom */}
                        <td className="px-5 py-3.5">
                          <div>
                            <p className="font-medium text-text-primary">{expense.title}</p>
                            {expense.notes && (
                              <p className="text-[11px] text-text-muted truncate max-w-48 mt-0.5">{expense.notes}</p>
                            )}
                          </div>
                        </td>

                        {/* Catégorie */}
                        <td className="px-5 py-3.5">
                          {expense.category ? (
                            <span className={clsx(
                              "inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-semibold",
                              getCategoryColor(expense.category)
                            )}>
                              {getCategoryLabel(expense.category)}
                            </span>
                          ) : (
                            <span className="text-xs text-text-muted">—</span>
                          )}
                        </td>

                        {/* Date */}
                        <td className="px-5 py-3.5 text-text-secondary whitespace-nowrap">
                          {formatDate(expense.expense_date)}
                        </td>

                        {/* Montant */}
                        <td className="px-5 py-3.5 text-right">
                          <span className="font-bold font-mono text-text-primary">
                            {formatAmount(expense.amount)}
                          </span>
                        </td>

                        {/* Statut */}
                        <td className="px-5 py-3.5">
                          <Badge variant={statusCfg.badge} size="sm">
                            {statusCfg.label}
                          </Badge>
                        </td>

                        {/* Actions */}
                        <td className="px-5 py-3.5">
                          {isConfirmingDelete ? (
                            <div className="flex items-center gap-1">
                              <button
                                onClick={() => handleDelete(expense.id)}
                                className="text-[10px] font-semibold text-status-error hover:bg-status-error/10 px-2 py-1 rounded-lg transition-colors"
                              >
                                Oui
                              </button>
                              <button
                                onClick={() => setConfirmDelete(null)}
                                className="text-[10px] text-text-muted hover:bg-surface-hover px-2 py-1 rounded-lg transition-colors"
                              >
                                Non
                              </button>
                            </div>
                          ) : (
                            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                              <button
                                onClick={() => openEdit(expense)}
                                className="p-1.5 rounded-lg text-text-muted hover:text-text-primary hover:bg-surface-hover transition-colors"
                                title="Modifier"
                              >
                                <Pencil className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={() => setConfirmDelete(expense.id)}
                                className="p-1.5 rounded-lg text-text-muted hover:text-status-error hover:bg-status-error/10 transition-colors"
                                title="Supprimer"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
