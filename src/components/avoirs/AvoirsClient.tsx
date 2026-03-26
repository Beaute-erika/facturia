"use client";

import { useState, useMemo, useCallback, useEffect } from "react";
import {
  FileMinus, Plus, Search, Pencil, Trash2, Loader2, X,
  AlertCircle, ChevronDown,
} from "lucide-react";
import { clsx } from "clsx";
import type { AvoirRow } from "@/lib/database.types";

// ─── Types ────────────────────────────────────────────────────────────────────

interface LigneForm {
  id:            string;
  description:   string;
  quantite:      string;
  unite:         string;
  prix_unitaire: string;
}

interface AvoirFormState {
  numero:        string;
  client_nom:    string;
  client_email:  string;
  objet:         string;
  motif:         string;
  date_emission: string;
  taux_tva:      string;
  statut:        "brouillon" | "emis" | "annule";
  notes:         string;
  lignes:        LigneForm[];
}

const today = () => new Date().toISOString().split("T")[0];

const newLigne = (): LigneForm => ({
  id:            crypto.randomUUID(),
  description:   "",
  quantite:      "1",
  unite:         "",
  prix_unitaire: "",
});

const EMPTY_FORM = (): AvoirFormState => ({
  numero:        "",
  client_nom:    "",
  client_email:  "",
  objet:         "",
  motif:         "",
  date_emission: today(),
  taux_tva:      "20",
  statut:        "brouillon",
  notes:         "",
  lignes:        [newLigne()],
});

const fmt = (n: number) =>
  n.toLocaleString("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const parseNum = (s: string) => parseFloat(s.replace(",", ".")) || 0;

function computeTotals(lignes: LigneForm[], taux_tva: string) {
  const ht  = lignes.reduce((acc, l) => acc + parseNum(l.quantite) * parseNum(l.prix_unitaire), 0);
  const tva = ht * (parseNum(taux_tva) / 100);
  return { montant_ht: ht, montant_tva: tva, montant_ttc: ht + tva };
}

const STATUT_LABELS: Record<AvoirRow["statut"], string> = {
  brouillon: "Brouillon",
  emis:      "Émis",
  annule:    "Annulé",
};

const STATUT_COLORS: Record<AvoirRow["statut"], string> = {
  brouillon: "bg-surface-active text-text-secondary",
  emis:      "bg-status-success/20 text-status-success",
  annule:    "bg-status-error/20 text-status-error",
};

// ─── Modal ────────────────────────────────────────────────────────────────────

interface ModalProps {
  initial: AvoirFormState;
  title:   string;
  onClose:  () => void;
  onSubmit: (form: AvoirFormState) => Promise<void>;
  saving:   boolean;
}

function AvoirModal({ initial, title, onClose, onSubmit, saving }: ModalProps) {
  const [form,   setForm]   = useState<AvoirFormState>(initial);
  const [errors, setErrors] = useState<Partial<Record<string, string>>>({});

  const set = <K extends keyof AvoirFormState>(field: K, value: AvoirFormState[K]) =>
    setForm((f) => ({ ...f, [field]: value }));

  const setLigne = (id: string, field: keyof LigneForm, value: string) =>
    setForm((f) => ({
      ...f,
      lignes: f.lignes.map((l) => l.id === id ? { ...l, [field]: value } : l),
    }));

  const addLigne    = () => setForm((f) => ({ ...f, lignes: [...f.lignes, newLigne()] }));
  const removeLigne = (id: string) =>
    setForm((f) => ({ ...f, lignes: f.lignes.filter((l) => l.id !== id) }));

  const totals = useMemo(() => computeTotals(form.lignes, form.taux_tva), [form.lignes, form.taux_tva]);

  const validate = () => {
    const e: Partial<Record<string, string>> = {};
    if (!form.client_nom.trim()) e.client_nom = "Requis";
    if (!form.objet.trim())      e.objet      = "Requis";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    await onSubmit(form);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />

      <form
        onSubmit={handleSubmit}
        className="relative z-10 w-full max-w-2xl flex flex-col bg-surface border border-surface-border rounded-2xl shadow-card max-h-[90vh] overflow-hidden"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-surface-border flex-shrink-0">
          <div className="flex items-center gap-2">
            <FileMinus className="w-4 h-4 text-primary" />
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
        <div className="overflow-y-auto px-6 py-5 space-y-4">
          {/* Row 1 */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="field-label">Numéro <span className="text-text-muted font-normal">(optionnel)</span></label>
              <input
                autoFocus
                value={form.numero}
                onChange={(e) => set("numero", e.target.value)}
                placeholder="AV-001"
                className="input-field w-full text-sm mt-1"
              />
            </div>
            <div>
              <label className="field-label">Date d&apos;émission</label>
              <input
                type="date"
                value={form.date_emission}
                onChange={(e) => set("date_emission", e.target.value)}
                className="input-field w-full text-sm mt-1"
              />
            </div>
          </div>

          {/* Client */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="field-label">Client <span className="text-status-error">*</span></label>
              <input
                value={form.client_nom}
                onChange={(e) => set("client_nom", e.target.value)}
                placeholder="Nom du client"
                className={clsx("input-field w-full text-sm mt-1", errors.client_nom && "border-status-error")}
              />
              {errors.client_nom && <p className="text-xs text-status-error mt-1">{errors.client_nom}</p>}
            </div>
            <div>
              <label className="field-label">Email client <span className="text-text-muted font-normal">(optionnel)</span></label>
              <input
                type="email"
                value={form.client_email}
                onChange={(e) => set("client_email", e.target.value)}
                placeholder="client@email.com"
                className="input-field w-full text-sm mt-1"
              />
            </div>
          </div>

          {/* Objet + Motif */}
          <div>
            <label className="field-label">Objet <span className="text-status-error">*</span></label>
            <input
              value={form.objet}
              onChange={(e) => set("objet", e.target.value)}
              placeholder="Avoir sur facture n°…"
              className={clsx("input-field w-full text-sm mt-1", errors.objet && "border-status-error")}
            />
            {errors.objet && <p className="text-xs text-status-error mt-1">{errors.objet}</p>}
          </div>

          <div>
            <label className="field-label">Motif <span className="text-text-muted font-normal">(optionnel)</span></label>
            <input
              value={form.motif}
              onChange={(e) => set("motif", e.target.value)}
              placeholder="Erreur de facturation, retour produit…"
              className="input-field w-full text-sm mt-1"
            />
          </div>

          {/* Lignes */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="field-label mb-0">Lignes</label>
              <button
                type="button"
                onClick={addLigne}
                className="flex items-center gap-1 text-xs text-primary hover:text-primary-400 font-medium transition-colors"
              >
                <Plus className="w-3 h-3" /> Ajouter une ligne
              </button>
            </div>
            <div className="space-y-2">
              {form.lignes.map((ligne) => (
                <div key={ligne.id} className="grid grid-cols-[1fr_80px_80px_90px_32px] gap-2 items-start">
                  <input
                    value={ligne.description}
                    onChange={(e) => setLigne(ligne.id, "description", e.target.value)}
                    placeholder="Description"
                    className="input-field text-sm"
                  />
                  <input
                    type="number"
                    min={0}
                    step={0.01}
                    value={ligne.quantite}
                    onChange={(e) => setLigne(ligne.id, "quantite", e.target.value)}
                    placeholder="Qté"
                    className="input-field text-sm"
                  />
                  <input
                    value={ligne.unite}
                    onChange={(e) => setLigne(ligne.id, "unite", e.target.value)}
                    placeholder="Unité"
                    className="input-field text-sm"
                  />
                  <div className="relative">
                    <input
                      type="number"
                      min={0}
                      step={0.01}
                      value={ligne.prix_unitaire}
                      onChange={(e) => setLigne(ligne.id, "prix_unitaire", e.target.value)}
                      placeholder="P.U. HT"
                      className="input-field text-sm pr-5 w-full"
                    />
                    <span className="absolute right-2 top-1/2 -translate-y-1/2 text-text-muted text-xs">€</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => removeLigne(ligne.id)}
                    disabled={form.lignes.length === 1}
                    className="w-8 h-8 flex items-center justify-center rounded-lg text-text-muted hover:text-status-error hover:bg-status-error/10 transition-colors disabled:opacity-30"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* TVA + Totaux */}
          <div className="flex items-start gap-4">
            <div className="w-32">
              <label className="field-label">TVA (%)</label>
              <input
                type="number"
                min={0}
                max={100}
                step={0.1}
                value={form.taux_tva}
                onChange={(e) => set("taux_tva", e.target.value)}
                className="input-field w-full text-sm mt-1"
              />
            </div>
            <div className="flex-1 bg-surface-active rounded-xl p-3 text-sm space-y-1 mt-1">
              <div className="flex justify-between text-text-muted">
                <span>Total HT</span>
                <span className="font-mono">{fmt(totals.montant_ht)} €</span>
              </div>
              <div className="flex justify-between text-text-muted">
                <span>TVA ({form.taux_tva}%)</span>
                <span className="font-mono">{fmt(totals.montant_tva)} €</span>
              </div>
              <div className="flex justify-between font-semibold text-text-primary border-t border-surface-border pt-1 mt-1">
                <span>Total TTC</span>
                <span className="font-mono">{fmt(totals.montant_ttc)} €</span>
              </div>
            </div>
          </div>

          {/* Statut */}
          <div>
            <label className="field-label">Statut</label>
            <div className="relative mt-1">
              <select
                value={form.statut}
                onChange={(e) => set("statut", e.target.value as AvoirFormState["statut"])}
                className="input-field w-full text-sm appearance-none pr-8"
              >
                <option value="brouillon">Brouillon</option>
                <option value="emis">Émis</option>
                <option value="annule">Annulé</option>
              </select>
              <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-text-muted pointer-events-none" />
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className="field-label">Notes <span className="text-text-muted font-normal">(optionnel)</span></label>
            <textarea
              value={form.notes}
              onChange={(e) => set("notes", e.target.value)}
              rows={3}
              placeholder="Informations complémentaires…"
              className="input-field w-full text-sm resize-none leading-relaxed mt-1"
            />
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-surface-border flex-shrink-0">
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
            {saving && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
            Enregistrer
          </button>
        </div>
      </form>
    </div>
  );
}

// ─── Row ──────────────────────────────────────────────────────────────────────

interface RowProps {
  avoir:    AvoirRow;
  onEdit:   () => void;
  onDelete: () => void;
  deleting: boolean;
}

function AvoirRow({ avoir, onEdit, onDelete, deleting }: RowProps) {
  return (
    <div className="group flex items-center gap-4 px-4 py-3 bg-background border border-surface-border rounded-xl hover:border-primary/30 transition-colors">
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <p className="text-sm font-semibold text-text-primary">{avoir.numero || "—"}</p>
          <span className={clsx("text-[10px] font-bold px-2 py-0.5 rounded-full", STATUT_COLORS[avoir.statut])}>
            {STATUT_LABELS[avoir.statut]}
          </span>
        </div>
        <p className="text-xs text-text-muted mt-0.5 truncate">{avoir.client_nom} — {avoir.objet}</p>
      </div>
      <div className="text-right flex-shrink-0">
        <p className="text-sm font-bold font-mono text-text-primary">{fmt(avoir.montant_ttc)} €</p>
        <p className="text-[10px] text-text-muted">{new Date(avoir.date_emission).toLocaleDateString("fr-FR")}</p>
      </div>
      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
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
          {deleting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
        </button>
      </div>
    </div>
  );
}

// ─── Main ─────────────────────────────────────────────────────────────────────

export default function AvoirsClient() {
  const [avoirs,    setAvoirs]    = useState<AvoirRow[]>([]);
  const [loading,   setLoading]   = useState(true);
  const [search,    setSearch]    = useState("");
  const [showModal, setShowModal] = useState<"create" | AvoirRow | null>(null);
  const [saving,    setSaving]    = useState(false);
  const [deleting,  setDeleting]  = useState<string | null>(null);
  const [error,     setError]     = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res  = await fetch("/api/avoirs");
      const data = await res.json() as { avoirs?: AvoirRow[]; error?: string };
      if (data.error) throw new Error(data.error);
      setAvoirs(data.avoirs ?? []);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erreur de chargement");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    if (!q) return avoirs;
    return avoirs.filter(
      (a) =>
        a.numero?.toLowerCase().includes(q) ||
        a.client_nom.toLowerCase().includes(q) ||
        a.objet.toLowerCase().includes(q)
    );
  }, [avoirs, search]);

  const formToPayload = (form: AvoirFormState) => {
    const totals = computeTotals(form.lignes, form.taux_tva);
    return {
      numero:        form.numero.trim() || undefined,
      client_nom:    form.client_nom.trim(),
      client_email:  form.client_email.trim() || null,
      objet:         form.objet.trim(),
      motif:         form.motif.trim() || null,
      date_emission: form.date_emission,
      taux_tva:      parseNum(form.taux_tva),
      montant_ht:    totals.montant_ht,
      montant_tva:   totals.montant_tva,
      montant_ttc:   totals.montant_ttc,
      statut:        form.statut,
      notes:         form.notes.trim() || null,
      lignes:        form.lignes.map((l) => ({
        id:            l.id,
        description:   l.description,
        quantite:      parseNum(l.quantite),
        unite:         l.unite,
        prix_unitaire: parseNum(l.prix_unitaire),
        tva:           parseNum(form.taux_tva),
        total_ht:      parseNum(l.quantite) * parseNum(l.prix_unitaire),
      })),
    };
  };

  const handleCreate = async (form: AvoirFormState) => {
    setSaving(true);
    try {
      const res  = await fetch("/api/avoirs", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify(formToPayload(form)),
      });
      const data = await res.json() as { avoir?: AvoirRow; error?: string };
      if (data.error) throw new Error(data.error);
      setAvoirs((prev) => [data.avoir!, ...prev]);
      setShowModal(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erreur de création");
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = async (form: AvoirFormState) => {
    if (typeof showModal !== "object" || showModal === null) return;
    const id = showModal.id;
    setSaving(true);
    try {
      const res  = await fetch(`/api/avoirs/${id}`, {
        method:  "PATCH",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify(formToPayload(form)),
      });
      const data = await res.json() as { avoir?: AvoirRow; error?: string };
      if (data.error) throw new Error(data.error);
      setAvoirs((prev) => prev.map((a) => (a.id === id ? data.avoir! : a)));
      setShowModal(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erreur de mise à jour");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Supprimer cet avoir ?")) return;
    setDeleting(id);
    try {
      const res = await fetch(`/api/avoirs/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Erreur de suppression");
      setAvoirs((prev) => prev.filter((a) => a.id !== id));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erreur");
    } finally {
      setDeleting(null);
    }
  };

  const editInitial = (avoir: AvoirRow): AvoirFormState => ({
    numero:        avoir.numero ?? "",
    client_nom:    avoir.client_nom,
    client_email:  avoir.client_email ?? "",
    objet:         avoir.objet,
    motif:         avoir.motif ?? "",
    date_emission: avoir.date_emission,
    taux_tva:      String(avoir.taux_tva),
    statut:        avoir.statut,
    notes:         avoir.notes ?? "",
    lignes:        (avoir.lignes as unknown as Record<string, unknown>[]).length > 0
      ? (avoir.lignes as unknown as Record<string, unknown>[]).map((l) => ({
          id:            (l.id as string) ?? crypto.randomUUID(),
          description:   (l.description as string) ?? "",
          quantite:      String(l.quantite ?? 1),
          unite:         (l.unite as string) ?? "",
          prix_unitaire: String(l.prix_unitaire ?? ""),
        }))
      : [newLigne()],
  });

  return (
    <>
      <div className="min-h-screen bg-background">
        {/* Header */}
        <div className="border-b border-surface-border bg-background px-6 py-5">
          <div className="max-w-4xl mx-auto flex items-center justify-between gap-4">
            <div>
              <h1 className="text-xl font-bold text-text-primary flex items-center gap-2">
                <FileMinus className="w-5 h-5 text-primary" />
                Avoirs
              </h1>
              <p className="text-xs text-text-muted mt-0.5">
                {avoirs.length} avoir{avoirs.length !== 1 ? "s" : ""} — notes de crédit
              </p>
            </div>
            <button
              onClick={() => setShowModal("create")}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-primary text-background text-sm font-semibold hover:bg-primary-400 transition-colors"
            >
              <Plus className="w-4 h-4" /> Nouvel avoir
            </button>
          </div>
        </div>

        <div className="max-w-4xl mx-auto px-6 py-6">
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
              placeholder="Rechercher un avoir, client, objet…"
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

          {loading ? (
            <div className="flex items-center justify-center py-20 gap-3 text-text-muted">
              <Loader2 className="w-5 h-5 animate-spin" />
              <span className="text-sm">Chargement…</span>
            </div>
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 gap-4 text-text-muted">
              <div className="w-16 h-16 rounded-2xl bg-surface flex items-center justify-center border border-surface-border">
                <FileMinus className="w-7 h-7 opacity-40" />
              </div>
              <div className="text-center">
                <p className="text-sm font-semibold text-text-primary">
                  {search ? "Aucun résultat" : "Aucun avoir pour l'instant"}
                </p>
                <p className="text-xs text-text-muted mt-1">
                  {search
                    ? "Essayez un autre terme"
                    : "Les avoirs servent à annuler ou corriger une facture"}
                </p>
              </div>
              {!search && (
                <button
                  onClick={() => setShowModal("create")}
                  className="flex items-center gap-2 px-4 py-2 rounded-xl bg-primary text-background text-sm font-semibold hover:bg-primary-400 transition-colors mt-1"
                >
                  <Plus className="w-4 h-4" /> Créer un avoir
                </button>
              )}
            </div>
          ) : (
            <div className="space-y-2">
              {filtered.map((avoir) => (
                <AvoirRow
                  key={avoir.id}
                  avoir={avoir}
                  onEdit={() => setShowModal(avoir)}
                  onDelete={() => handleDelete(avoir.id)}
                  deleting={deleting === avoir.id}
                />
              ))}
            </div>
          )}
        </div>
      </div>

      {showModal === "create" && (
        <AvoirModal
          initial={EMPTY_FORM()}
          title="Nouvel avoir"
          onClose={() => setShowModal(null)}
          onSubmit={handleCreate}
          saving={saving}
        />
      )}
      {showModal !== null && showModal !== "create" && (
        <AvoirModal
          initial={editInitial(showModal)}
          title="Modifier l'avoir"
          onClose={() => setShowModal(null)}
          onSubmit={handleEdit}
          saving={saving}
        />
      )}
    </>
  );
}
