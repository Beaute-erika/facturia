// ─── Statuts ──────────────────────────────────────────────────────────────────

export type ExpenseStatus = "paid" | "pending" | "reimbursed";

// ─── Catégories ───────────────────────────────────────────────────────────────

export type ExpenseCategory =
  | "carburant"
  | "logiciel"
  | "materiel"
  | "sous_traitance"
  | "repas"
  | "transport"
  | "hebergement"
  | "formation"
  | "fournitures"
  | "divers";

// ─── Types UI ─────────────────────────────────────────────────────────────────

export interface Expense {
  id: string;
  title: string;
  amount: number;
  category: string | null;
  expense_date: string; // YYYY-MM-DD
  status: ExpenseStatus;
  notes: string | null;
  created_at: string;
}

export interface ExpenseInput {
  title: string;
  amount: number;
  category: string | null;
  expense_date: string;
  status: ExpenseStatus;
  notes?: string | null;
}

// ─── Configs d'affichage ──────────────────────────────────────────────────────

export const EXPENSE_CATEGORIES: { id: ExpenseCategory; label: string; color: string }[] = [
  { id: "carburant",      label: "Carburant",        color: "text-status-warning bg-status-warning/10" },
  { id: "logiciel",       label: "Logiciel / SaaS",  color: "text-status-info bg-status-info/10" },
  { id: "materiel",       label: "Matériel",         color: "text-primary bg-primary/10" },
  { id: "sous_traitance", label: "Sous-traitance",   color: "text-status-error bg-status-error/10" },
  { id: "repas",          label: "Repas",            color: "text-status-success bg-status-success/10" },
  { id: "transport",      label: "Transport",        color: "text-status-warning bg-status-warning/10" },
  { id: "hebergement",    label: "Hébergement",      color: "text-primary bg-primary/10" },
  { id: "formation",      label: "Formation",        color: "text-status-info bg-status-info/10" },
  { id: "fournitures",    label: "Fournitures",      color: "text-text-secondary bg-surface-active" },
  { id: "divers",         label: "Divers",           color: "text-text-muted bg-surface-active" },
];

export const EXPENSE_STATUS: Record<ExpenseStatus, { label: string; badge: "success" | "warning" | "info" }> = {
  paid:       { label: "Payé",       badge: "success" },
  pending:    { label: "En attente", badge: "warning" },
  reimbursed: { label: "Remboursé",  badge: "info"    },
};

/** Retourne le label d'une catégorie ou "Divers" par défaut */
export function getCategoryLabel(id: string | null): string {
  return EXPENSE_CATEGORIES.find((c) => c.id === id)?.label ?? (id ?? "—");
}

/** Retourne les classes couleur d'une catégorie */
export function getCategoryColor(id: string | null): string {
  return EXPENSE_CATEGORIES.find((c) => c.id === id)?.color ?? "text-text-muted bg-surface-active";
}
