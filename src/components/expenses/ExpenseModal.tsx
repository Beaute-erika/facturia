"use client";

import { useState } from "react";
import { X, Loader2 } from "lucide-react";
import { clsx } from "clsx";
import type { Expense, ExpenseInput } from "@/lib/expenses-types";
import { EXPENSE_CATEGORIES } from "@/lib/expenses-types";

interface ExpenseModalProps {
  expense?: Expense | null; // null/undefined = création, Expense = édition
  onClose: () => void;
  onSave:  (input: ExpenseInput, id?: string) => Promise<void>;
}

export default function ExpenseModal({ expense, onClose, onSave }: ExpenseModalProps) {
  const isEdit = !!expense;

  const today = new Date().toISOString().split("T")[0];

  const [title,       setTitle]       = useState(expense?.title        ?? "");
  const [amount,      setAmount]      = useState(expense ? String(expense.amount) : "");
  const [category,    setCategory]    = useState(expense?.category     ?? "");
  const [expenseDate, setExpenseDate] = useState(expense?.expense_date ?? today);
  const [status,      setStatus]      = useState<"paid" | "pending" | "reimbursed">(expense?.status ?? "paid");
  const [notes,       setNotes]       = useState(expense?.notes        ?? "");
  const [saving,      setSaving]      = useState(false);
  const [errors,      setErrors]      = useState<Partial<Record<"title" | "amount" | "expense_date", string>>>({});

  const validate = (): boolean => {
    const e: typeof errors = {};
    if (!title.trim()) e.title = "Nom obligatoire";
    if (!amount || isNaN(Number(amount)) || Number(amount) <= 0) e.amount = "Montant positif requis";
    if (!expenseDate) e.expense_date = "Date obligatoire";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = async (ev: React.FormEvent) => {
    ev.preventDefault();
    if (!validate()) return;
    setSaving(true);
    try {
      await onSave(
        {
          title:        title.trim(),
          amount:       Number(amount),
          category:     category || null,
          expense_date: expenseDate,
          status,
          notes:        notes.trim() || null,
        },
        expense?.id,
      );
    } finally {
      setSaving(false);
    }
  };

  const STATUS_LABELS: Record<typeof status, string> = {
    paid:       "Payé",
    pending:    "En attente",
    reimbursed: "Remboursé",
  };

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 z-40 bg-black/50 backdrop-blur-[2px]" onClick={onClose} />

      {/* Modal */}
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none">
        <div className="w-full max-w-md bg-background-secondary border border-surface-border rounded-2xl shadow-card animate-fade-in pointer-events-auto">

          {/* En-tête */}
          <div className="px-5 py-4 border-b border-surface-border flex items-center justify-between">
            <h2 className="text-base font-bold text-text-primary">
              {isEdit ? "Modifier le frais" : "Nouveau frais"}
            </h2>
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-lg text-text-muted hover:text-text-primary hover:bg-surface-hover transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Formulaire */}
          <form onSubmit={handleSubmit} noValidate>
            <div className="p-5 space-y-4">

              {/* Nom */}
              <div>
                <label className="block text-xs font-semibold text-text-muted mb-1.5">
                  Nom du frais <span className="text-status-error">*</span>
                </label>
                <input
                  value={title}
                  onChange={(e) => { setTitle(e.target.value); setErrors((p) => ({ ...p, title: undefined })); }}
                  placeholder="Ex : Carburant trajet client"
                  className={clsx("input-field w-full", errors.title && "border-status-error focus:border-status-error")}
                  autoFocus
                />
                {errors.title && <p className="text-[11px] text-status-error mt-1">{errors.title}</p>}
              </div>

              {/* Montant + Date */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-text-muted mb-1.5">
                    Montant (€) <span className="text-status-error">*</span>
                  </label>
                  <input
                    type="number"
                    min="0.01"
                    step="0.01"
                    value={amount}
                    onChange={(e) => { setAmount(e.target.value); setErrors((p) => ({ ...p, amount: undefined })); }}
                    placeholder="0,00"
                    className={clsx("input-field w-full", errors.amount && "border-status-error")}
                  />
                  {errors.amount && <p className="text-[11px] text-status-error mt-1">{errors.amount}</p>}
                </div>
                <div>
                  <label className="block text-xs font-semibold text-text-muted mb-1.5">
                    Date <span className="text-status-error">*</span>
                  </label>
                  <input
                    type="date"
                    value={expenseDate}
                    onChange={(e) => { setExpenseDate(e.target.value); setErrors((p) => ({ ...p, expense_date: undefined })); }}
                    className={clsx("input-field w-full", errors.expense_date && "border-status-error")}
                  />
                  {errors.expense_date && <p className="text-[11px] text-status-error mt-1">{errors.expense_date}</p>}
                </div>
              </div>

              {/* Catégorie */}
              <div>
                <label className="block text-xs font-semibold text-text-muted mb-1.5">Catégorie</label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="input-field w-full"
                >
                  <option value="">Sans catégorie</option>
                  {EXPENSE_CATEGORIES.map((c) => (
                    <option key={c.id} value={c.id}>{c.label}</option>
                  ))}
                </select>
              </div>

              {/* Statut */}
              <div>
                <label className="block text-xs font-semibold text-text-muted mb-1.5">Statut</label>
                <div className="flex gap-2">
                  {(Object.keys(STATUS_LABELS) as (typeof status)[]).map((s) => (
                    <button
                      type="button"
                      key={s}
                      onClick={() => setStatus(s)}
                      className={clsx(
                        "flex-1 py-1.5 rounded-lg text-xs font-semibold transition-all",
                        status === s
                          ? "bg-primary text-background"
                          : "bg-surface text-text-muted hover:bg-surface-hover border border-surface-border"
                      )}
                    >
                      {STATUS_LABELS[s]}
                    </button>
                  ))}
                </div>
              </div>

              {/* Notes */}
              <div>
                <label className="block text-xs font-semibold text-text-muted mb-1.5">Notes</label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Description, numéro de reçu, fournisseur…"
                  rows={2}
                  className="input-field w-full resize-none text-sm"
                />
              </div>
            </div>

            {/* Footer */}
            <div className="px-5 py-4 border-t border-surface-border flex justify-end gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-sm rounded-xl text-text-secondary hover:text-text-primary hover:bg-surface-hover border border-surface-border transition-colors"
              >
                Annuler
              </button>
              <button
                type="submit"
                disabled={saving}
                className="px-4 py-2 text-sm rounded-xl bg-primary text-background font-semibold flex items-center gap-1.5 hover:bg-primary-400 transition-colors disabled:opacity-50"
              >
                {saving && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                {isEdit ? "Enregistrer" : "Créer le frais"}
              </button>
            </div>
          </form>
        </div>
      </div>
    </>
  );
}
