"use client";

import { useState, useMemo, useCallback, useEffect } from "react";
import {
  Package, Plus, Search, Pencil, Trash2, Loader2, X, Sparkles,
  AlertCircle, ChevronDown, ChevronUp,
} from "lucide-react";
import { clsx } from "clsx";
import type { ServiceRow } from "@/lib/database.types";

// ─── Types ────────────────────────────────────────────────────────────────────

interface ServiceFormState {
  name:        string;
  description: string;
  price_ht:    string;
  category:    string;
}

const EMPTY_FORM: ServiceFormState = {
  name:        "",
  description: "",
  price_ht:    "",
  category:    "",
};

const fmt = (n: number) =>
  n.toLocaleString("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

// ─── ServiceModal ─────────────────────────────────────────────────────────────

interface ServiceModalProps {
  initial:   ServiceFormState;
  title:     string;
  onClose:   () => void;
  onSubmit:  (form: ServiceFormState) => Promise<void>;
  saving:    boolean;
}

function ServiceModal({ initial, title, onClose, onSubmit, saving }: ServiceModalProps) {
  const [form,           setForm]    = useState<ServiceFormState>(initial);
  const [errors,         setErrors]  = useState<Partial<ServiceFormState>>({});
  const [aiLoading,      setAiLoad]  = useState(false);
  const [aiError,        setAiError] = useState<string | null>(null);

  const set = (field: keyof ServiceFormState) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
      setForm((f) => ({ ...f, [field]: e.target.value }));

  const validate = () => {
    const e: Partial<ServiceFormState> = {};
    if (!form.name.trim()) e.name = "Le nom est requis";
    const p = parseFloat(form.price_ht.replace(",", "."));
    if (form.price_ht.trim() && (isNaN(p) || p < 0)) e.price_ht = "Prix invalide";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    await onSubmit(form);
  };

  const generateDescription = async () => {
    if (!form.name.trim()) {
      setErrors((er) => ({ ...er, name: "Entrez un nom pour générer la description" }));
      return;
    }
    setAiLoad(true);
    setAiError(null);
    try {
      const res  = await fetch("/api/services/ai-description", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ name: form.name.trim(), category: form.category.trim() || undefined }),
      });
      const data = await res.json() as { description?: string; error?: string };
      if (data.description) {
        setForm((f) => ({ ...f, description: data.description! }));
      } else {
        setAiError(data.error ?? "Erreur de génération");
      }
    } catch {
      setAiError("Erreur réseau");
    } finally {
      setAiLoad(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />

      <form
        onSubmit={handleSubmit}
        className="relative z-10 w-full max-w-lg flex flex-col bg-surface border border-surface-border rounded-2xl shadow-card"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-surface-border">
          <div className="flex items-center gap-2">
            <Package className="w-4 h-4 text-primary" />
            <h2 className="text-base font-bold text-text-primary">{title}</h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-xl text-text-muted hover:text-text-primary hover:bg-surface-active transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <div className="px-6 py-5 space-y-4">
          {/* Name */}
          <div>
            <label className="field-label">Nom du service <span className="text-status-error">*</span></label>
            <input
              autoFocus
              value={form.name}
              onChange={set("name")}
              placeholder="Ex : Pose de carrelage, Peinture façade…"
              className={clsx("input-field w-full text-sm mt-1", errors.name && "border-status-error")}
            />
            {errors.name && <p className="text-xs text-status-error mt-1">{errors.name}</p>}
          </div>

          {/* Category */}
          <div>
            <label className="field-label">Catégorie <span className="text-text-muted font-normal">(optionnel)</span></label>
            <input
              value={form.category}
              onChange={set("category")}
              placeholder="Ex : Maçonnerie, Électricité, Main d'œuvre…"
              className="input-field w-full text-sm mt-1"
            />
          </div>

          {/* Price */}
          <div>
            <label className="field-label">Prix HT <span className="text-text-muted font-normal">(€)</span></label>
            <div className="relative mt-1">
              <input
                type="number"
                min={0}
                step={0.01}
                value={form.price_ht}
                onChange={set("price_ht")}
                placeholder="0.00"
                className={clsx("input-field w-full text-sm pr-7", errors.price_ht && "border-status-error")}
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted text-sm">€</span>
            </div>
            {errors.price_ht && <p className="text-xs text-status-error mt-1">{errors.price_ht}</p>}
          </div>

          {/* Description */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="field-label mb-0">Description <span className="text-text-muted font-normal">(optionnel)</span></label>
              <button
                type="button"
                onClick={generateDescription}
                disabled={aiLoading}
                className="flex items-center gap-1.5 text-xs text-primary hover:text-primary-400 font-medium transition-colors disabled:opacity-50"
              >
                {aiLoading
                  ? <><Loader2 className="w-3 h-3 animate-spin" /> Génération…</>
                  : <><Sparkles className="w-3 h-3" /> Générer avec l&apos;IA</>
                }
              </button>
            </div>
            {aiError && (
              <p className="text-xs text-status-error mb-1 flex items-center gap-1">
                <AlertCircle className="w-3 h-3" /> {aiError}
              </p>
            )}
            <textarea
              value={form.description}
              onChange={set("description")}
              placeholder="Décrivez la prestation, les livrables inclus…"
              rows={4}
              className="input-field w-full text-sm resize-none leading-relaxed"
            />
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-surface-border">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-sm font-medium text-text-muted hover:text-text-primary hover:bg-surface-active transition-colors"
          >
            Annuler
          </button>
          <button
            type="submit"
            disabled={saving}
            className="flex items-center gap-2 px-5 py-2 rounded-xl bg-primary text-background text-sm font-semibold hover:bg-primary-400 transition-colors disabled:opacity-50"
          >
            {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : null}
            Enregistrer
          </button>
        </div>
      </form>
    </div>
  );
}

// ─── ServiceCard ──────────────────────────────────────────────────────────────

interface CardProps {
  service:   ServiceRow;
  onEdit:    () => void;
  onDelete:  () => void;
  deleting:  boolean;
}

function ServiceCard({ service, onEdit, onDelete, deleting }: CardProps) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="group flex flex-col bg-background border border-surface-border rounded-xl p-4 hover:border-primary/30 transition-colors">
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <p className="text-sm font-semibold text-text-primary truncate">{service.name}</p>
            {service.category && (
              <span className="text-[10px] font-semibold text-primary bg-primary/10 px-2 py-0.5 rounded-full">
                {service.category}
              </span>
            )}
          </div>
          <p className="text-base font-bold font-mono text-text-primary mt-1">
            {fmt(service.price_ht)} € <span className="text-xs text-text-muted font-normal font-sans">HT</span>
          </p>
          {service.description && (
            <div className="mt-1.5">
              <p className={clsx(
                "text-xs text-text-muted leading-relaxed",
                !expanded && "line-clamp-2"
              )}>
                {service.description}
              </p>
              {service.description.length > 120 && (
                <button
                  type="button"
                  onClick={() => setExpanded((v) => !v)}
                  className="flex items-center gap-1 text-[10px] text-text-muted hover:text-text-primary mt-1 transition-colors"
                >
                  {expanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                  {expanded ? "Réduire" : "Voir plus"}
                </button>
              )}
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex items-center gap-1 flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
          <button
            type="button"
            onClick={onEdit}
            className="p-1.5 rounded-lg text-text-muted hover:text-primary hover:bg-primary/10 transition-colors"
            title="Modifier"
          >
            <Pencil className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={onDelete}
            disabled={deleting}
            className="p-1.5 rounded-lg text-text-muted hover:text-status-error hover:bg-status-error/10 transition-colors disabled:opacity-50"
            title="Supprimer"
          >
            {deleting
              ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
              : <Trash2 className="w-3.5 h-3.5" />
            }
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function ServicesClient() {
  const [services,  setServices]  = useState<ServiceRow[]>([]);
  const [loading,   setLoading]   = useState(true);
  const [search,    setSearch]    = useState("");
  const [showModal, setShowModal] = useState<"create" | ServiceRow | null>(null);
  const [saving,    setSaving]    = useState(false);
  const [deleting,  setDeleting]  = useState<string | null>(null);
  const [error,     setError]     = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res  = await fetch("/api/services");
      const data = await res.json() as { services?: ServiceRow[]; error?: string };
      if (data.error) throw new Error(data.error);
      setServices(data.services ?? []);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erreur de chargement");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  // Filtered + grouped
  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    if (!q) return services;
    return services.filter(
      (s) =>
        s.name.toLowerCase().includes(q) ||
        (s.description?.toLowerCase().includes(q) ?? false) ||
        (s.category?.toLowerCase().includes(q) ?? false)
    );
  }, [services, search]);

  const grouped = useMemo(() => {
    const map = new Map<string, ServiceRow[]>();
    for (const s of filtered) {
      const key = s.category || "Sans catégorie";
      const arr = map.get(key) ?? [];
      arr.push(s);
      map.set(key, arr);
    }
    return Array.from(map.entries()).sort(([a], [b]) => {
      if (a === "Sans catégorie") return 1;
      if (b === "Sans catégorie") return -1;
      return a.localeCompare(b, "fr");
    });
  }, [filtered]);

  const handleCreate = async (form: ServiceFormState) => {
    setSaving(true);
    try {
      const res  = await fetch("/api/services", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({
          name:        form.name.trim(),
          description: form.description.trim() || null,
          price_ht:    parseFloat(form.price_ht.replace(",", ".")) || 0,
          category:    form.category.trim() || null,
        }),
      });
      const data = await res.json() as { service?: ServiceRow; error?: string };
      if (data.error) throw new Error(data.error);
      setServices((prev) => [data.service!, ...prev]);
      setShowModal(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erreur de création");
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = async (form: ServiceFormState) => {
    if (typeof showModal !== "object" || showModal === null) return;
    const id = showModal.id;
    setSaving(true);
    try {
      const res  = await fetch(`/api/services/${id}`, {
        method:  "PATCH",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({
          name:        form.name.trim(),
          description: form.description.trim() || null,
          price_ht:    parseFloat(form.price_ht.replace(",", ".")) || 0,
          category:    form.category.trim() || null,
        }),
      });
      const data = await res.json() as { service?: ServiceRow; error?: string };
      if (data.error) throw new Error(data.error);
      setServices((prev) => prev.map((s) => (s.id === id ? data.service! : s)));
      setShowModal(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erreur de mise à jour");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Supprimer ce service ?")) return;
    setDeleting(id);
    try {
      const res = await fetch(`/api/services/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Erreur de suppression");
      setServices((prev) => prev.filter((s) => s.id !== id));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erreur");
    } finally {
      setDeleting(null);
    }
  };

  const editInitial = (service: ServiceRow): ServiceFormState => ({
    name:        service.name,
    description: service.description ?? "",
    price_ht:    service.price_ht > 0 ? String(service.price_ht) : "",
    category:    service.category ?? "",
  });

  return (
    <>
      <div className="min-h-screen bg-background">
        {/* Header */}
        <div className="border-b border-surface-border bg-background px-6 py-5">
          <div className="max-w-4xl mx-auto flex items-center justify-between gap-4">
            <div>
              <h1 className="text-xl font-bold text-text-primary flex items-center gap-2">
                <Package className="w-5 h-5 text-primary" />
                Services & Produits
              </h1>
              <p className="text-xs text-text-muted mt-0.5">
                {services.length} service{services.length !== 1 ? "s" : ""} — réutilisables dans vos devis et factures
              </p>
            </div>
            <button
              onClick={() => setShowModal("create")}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-primary text-background text-sm font-semibold hover:bg-primary-400 transition-colors"
            >
              <Plus className="w-4 h-4" /> Nouveau service
            </button>
          </div>
        </div>

        <div className="max-w-4xl mx-auto px-6 py-6">
          {/* Error */}
          {error && (
            <div className="flex items-center gap-2 px-4 py-3 rounded-xl bg-status-error/10 border border-status-error/20 text-status-error text-sm mb-5">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              {error}
            </div>
          )}

          {/* Search */}
          <div className="relative mb-6">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Rechercher un service, catégorie…"
              className="input-field w-full text-sm pl-9"
            />
            {search && (
              <button
                type="button"
                onClick={() => setSearch("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted hover:text-text-primary transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* Content */}
          {loading ? (
            <div className="flex items-center justify-center py-20 gap-3 text-text-muted">
              <Loader2 className="w-5 h-5 animate-spin" />
              <span className="text-sm">Chargement…</span>
            </div>
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 gap-4 text-text-muted">
              <div className="w-16 h-16 rounded-2xl bg-surface flex items-center justify-center border border-surface-border">
                <Package className="w-7 h-7 opacity-40" />
              </div>
              <div className="text-center">
                <p className="text-sm font-semibold text-text-primary">
                  {search ? "Aucun résultat" : "Aucun service pour l'instant"}
                </p>
                <p className="text-xs text-text-muted mt-1">
                  {search
                    ? "Essayez un autre terme de recherche"
                    : "Créez vos services pour les réutiliser dans vos devis et factures"}
                </p>
              </div>
              {!search && (
                <button
                  onClick={() => setShowModal("create")}
                  className="flex items-center gap-2 px-4 py-2 rounded-xl bg-primary text-background text-sm font-semibold hover:bg-primary-400 transition-colors mt-1"
                >
                  <Plus className="w-4 h-4" /> Créer mon premier service
                </button>
              )}
            </div>
          ) : (
            <div className="space-y-6">
              {grouped.map(([category, items]) => (
                <div key={category}>
                  <div className="flex items-center gap-3 mb-3">
                    <h2 className="text-xs font-semibold text-text-muted uppercase tracking-wider">{category}</h2>
                    <div className="flex-1 h-px bg-surface-border" />
                    <span className="text-[10px] text-text-muted">{items.length}</span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {items.map((service) => (
                      <ServiceCard
                        key={service.id}
                        service={service}
                        onEdit={() => setShowModal(service)}
                        onDelete={() => handleDelete(service.id)}
                        deleting={deleting === service.id}
                      />
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Modals */}
      {showModal === "create" && (
        <ServiceModal
          initial={EMPTY_FORM}
          title="Nouveau service"
          onClose={() => setShowModal(null)}
          onSubmit={handleCreate}
          saving={saving}
        />
      )}
      {showModal !== null && showModal !== "create" && (
        <ServiceModal
          initial={editInitial(showModal)}
          title="Modifier le service"
          onClose={() => setShowModal(null)}
          onSubmit={handleEdit}
          saving={saving}
        />
      )}
    </>
  );
}
