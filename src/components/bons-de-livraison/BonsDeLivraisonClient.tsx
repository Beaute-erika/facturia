"use client";

import { useState, useMemo, useCallback, useEffect } from "react";
import {
  Truck, Plus, Search, Pencil, Trash2, Loader2, X,
  AlertCircle, ChevronDown, CalendarDays,
} from "lucide-react";
import { clsx } from "clsx";
import type { BonDeLivraisonRow } from "@/lib/database.types";

// ─── Types ────────────────────────────────────────────────────────────────────

interface LigneBLForm {
  id: string; description: string; quantite: string; unite: string; reference: string;
}

interface BonLivraisonFormState {
  numero: string; client_nom: string; client_email: string; objet: string;
  date_emission: string; date_livraison: string;
  statut: BonDeLivraisonRow["statut"]; notes: string; lignes: LigneBLForm[];
}

const today = () => new Date().toISOString().split("T")[0];
const newLigne = (): LigneBLForm => ({ id: crypto.randomUUID(), description: "", quantite: "1", unite: "", reference: "" });
const EMPTY_FORM = (): BonLivraisonFormState => ({
  numero: "", client_nom: "", client_email: "", objet: "",
  date_emission: today(), date_livraison: "",
  statut: "brouillon", notes: "", lignes: [newLigne()],
});

const STATUT_LABELS: Record<BonDeLivraisonRow["statut"], string> = {
  brouillon: "Brouillon", envoye: "Envoyé", livre: "Livré", annule: "Annulé",
};
const STATUT_COLORS: Record<BonDeLivraisonRow["statut"], string> = {
  brouillon: "bg-surface-active text-text-secondary",
  envoye:    "bg-primary/20 text-primary",
  livre:     "bg-status-success/20 text-status-success",
  annule:    "bg-status-error/20 text-status-error",
};

// ─── Modal ────────────────────────────────────────────────────────────────────

function BonLivraisonModal({ initial, title, onClose, onSubmit, saving }: {
  initial: BonLivraisonFormState; title: string; onClose: () => void;
  onSubmit: (f: BonLivraisonFormState) => Promise<void>; saving: boolean;
}) {
  const [form, setForm] = useState<BonLivraisonFormState>(initial);
  const [errors, setErrors] = useState<Partial<Record<string, string>>>({});

  const set = <K extends keyof BonLivraisonFormState>(field: K, value: BonLivraisonFormState[K]) =>
    setForm((f) => ({ ...f, [field]: value }));
  const setLigne = (id: string, field: keyof LigneBLForm, value: string) =>
    setForm((f) => ({ ...f, lignes: f.lignes.map((l) => l.id === id ? { ...l, [field]: value } : l) }));
  const addLigne    = () => setForm((f) => ({ ...f, lignes: [...f.lignes, newLigne()] }));
  const removeLigne = (id: string) => setForm((f) => ({ ...f, lignes: f.lignes.filter((l) => l.id !== id) }));

  const validate = () => {
    const e: Partial<Record<string, string>> = {};
    if (!form.client_nom.trim()) e.client_nom = "Requis";
    if (!form.objet.trim())      e.objet = "Requis";
    setErrors(e); return Object.keys(e).length === 0;
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <form
        onSubmit={async (e) => { e.preventDefault(); if (validate()) await onSubmit(form); }}
        className="relative z-10 w-full max-w-2xl flex flex-col bg-surface border border-surface-border rounded-2xl shadow-card max-h-[90vh] overflow-hidden"
      >
        <div className="flex items-center justify-between px-6 py-4 border-b border-surface-border flex-shrink-0">
          <div className="flex items-center gap-2"><Truck className="w-4 h-4 text-primary" /><h2 className="text-base font-bold text-text-primary">{title}</h2></div>
          <button type="button" onClick={onClose} className="p-1.5 rounded-xl text-text-muted hover:text-text-primary hover:bg-surface-active transition-colors"><X className="w-4 h-4" /></button>
        </div>

        <div className="overflow-y-auto px-6 py-5 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="field-label">Numéro <span className="text-text-muted font-normal">(optionnel)</span></label>
              <input autoFocus value={form.numero} onChange={(e) => set("numero", e.target.value)} placeholder="BL-001" className="input-field w-full text-sm mt-1" />
            </div>
            <div>
              <label className="field-label">Date d&apos;émission</label>
              <input type="date" value={form.date_emission} onChange={(e) => set("date_emission", e.target.value)} className="input-field w-full text-sm mt-1" />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="field-label">Client <span className="text-status-error">*</span></label>
              <input value={form.client_nom} onChange={(e) => set("client_nom", e.target.value)} placeholder="Nom du client" className={clsx("input-field w-full text-sm mt-1", errors.client_nom && "border-status-error")} />
              {errors.client_nom && <p className="text-xs text-status-error mt-1">{errors.client_nom}</p>}
            </div>
            <div>
              <label className="field-label">Email <span className="text-text-muted font-normal">(optionnel)</span></label>
              <input type="email" value={form.client_email} onChange={(e) => set("client_email", e.target.value)} placeholder="client@email.com" className="input-field w-full text-sm mt-1" />
            </div>
          </div>

          <div>
            <label className="field-label">Objet <span className="text-status-error">*</span></label>
            <input value={form.objet} onChange={(e) => set("objet", e.target.value)} placeholder="Objet de la livraison…" className={clsx("input-field w-full text-sm mt-1", errors.objet && "border-status-error")} />
            {errors.objet && <p className="text-xs text-status-error mt-1">{errors.objet}</p>}
          </div>

          {/* Lignes — sans montants pour BL */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="field-label mb-0">Articles livrés</label>
              <button type="button" onClick={addLigne} className="flex items-center gap-1 text-xs text-primary hover:text-primary-400 font-medium transition-colors"><Plus className="w-3 h-3" /> Ajouter</button>
            </div>
            <div className="space-y-2">
              {form.lignes.map((ligne) => (
                <div key={ligne.id} className="grid grid-cols-[1fr_80px_80px_100px_32px] gap-2 items-start">
                  <input value={ligne.description} onChange={(e) => setLigne(ligne.id, "description", e.target.value)} placeholder="Description article" className="input-field text-sm" />
                  <input type="number" min={0} step={0.01} value={ligne.quantite} onChange={(e) => setLigne(ligne.id, "quantite", e.target.value)} placeholder="Qté" className="input-field text-sm" />
                  <input value={ligne.unite} onChange={(e) => setLigne(ligne.id, "unite", e.target.value)} placeholder="Unité" className="input-field text-sm" />
                  <input value={ligne.reference} onChange={(e) => setLigne(ligne.id, "reference", e.target.value)} placeholder="Référence" className="input-field text-sm" />
                  <button type="button" onClick={() => removeLigne(ligne.id)} disabled={form.lignes.length === 1} className="w-8 h-8 flex items-center justify-center rounded-lg text-text-muted hover:text-status-error hover:bg-status-error/10 transition-colors disabled:opacity-30">
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
            <p className="text-[10px] text-text-muted mt-2">Description · Quantité · Unité · Référence</p>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="field-label">Date de livraison <span className="text-text-muted font-normal">(optionnel)</span></label>
              <input type="date" value={form.date_livraison} onChange={(e) => set("date_livraison", e.target.value)} className="input-field w-full text-sm mt-1" />
            </div>
            <div>
              <label className="field-label">Statut</label>
              <div className="relative mt-1">
                <select value={form.statut} onChange={(e) => set("statut", e.target.value as BonLivraisonFormState["statut"])} className="input-field w-full text-sm appearance-none pr-8">
                  <option value="brouillon">Brouillon</option>
                  <option value="envoye">Envoyé</option>
                  <option value="livre">Livré</option>
                  <option value="annule">Annulé</option>
                </select>
                <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-text-muted pointer-events-none" />
              </div>
            </div>
          </div>

          <div>
            <label className="field-label">Notes <span className="text-text-muted font-normal">(optionnel)</span></label>
            <textarea value={form.notes} onChange={(e) => set("notes", e.target.value)} rows={3} placeholder="Informations complémentaires, conditions de livraison…" className="input-field w-full text-sm resize-none leading-relaxed mt-1" />
          </div>
        </div>

        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-surface-border flex-shrink-0">
          <button type="button" onClick={onClose} className="px-4 py-2 rounded-xl text-sm font-medium text-text-muted hover:text-text-primary hover:bg-surface-active transition-colors">Annuler</button>
          <button type="submit" disabled={saving} className="flex items-center gap-2 px-5 py-2 rounded-xl bg-primary text-background text-sm font-semibold hover:bg-primary-400 transition-colors disabled:opacity-50">
            {saving && <Loader2 className="w-3.5 h-3.5 animate-spin" />}Enregistrer
          </button>
        </div>
      </form>
    </div>
  );
}

// ─── Row ──────────────────────────────────────────────────────────────────────

function BonLivraisonRow({ item, onEdit, onDelete, deleting }: {
  item: BonDeLivraisonRow; onEdit: () => void; onDelete: () => void; deleting: boolean;
}) {
  const lignes = item.lignes as unknown as Record<string, unknown>[];
  const totalQte = lignes.reduce((acc, l) => acc + (Number(l.quantite) || 0), 0);

  return (
    <div className="group flex items-center gap-4 px-4 py-3 bg-background border border-surface-border rounded-xl hover:border-primary/30 transition-colors">
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <p className="text-sm font-semibold text-text-primary">{item.numero || "—"}</p>
          <span className={clsx("text-[10px] font-bold px-2 py-0.5 rounded-full", STATUT_COLORS[item.statut])}>{STATUT_LABELS[item.statut]}</span>
        </div>
        <p className="text-xs text-text-muted mt-0.5 truncate">{item.client_nom} — {item.objet}</p>
        {item.date_livraison && (
          <div className="flex items-center gap-1 mt-0.5">
            <CalendarDays className="w-3 h-3 text-text-muted flex-shrink-0" />
            <span className="text-[10px] text-text-muted">Livraison : {new Date(item.date_livraison).toLocaleDateString("fr-FR")}</span>
          </div>
        )}
      </div>
      <div className="text-right flex-shrink-0">
        <p className="text-sm font-bold font-mono text-text-primary">{totalQte} article{totalQte !== 1 ? "s" : ""}</p>
        <p className="text-[10px] text-text-muted">{new Date(item.date_emission).toLocaleDateString("fr-FR")}</p>
      </div>
      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
        <button type="button" onClick={onEdit} className="p-1.5 rounded-lg text-text-muted hover:text-primary hover:bg-primary/10 transition-colors" title="Modifier"><Pencil className="w-3.5 h-3.5" /></button>
        <button type="button" onClick={onDelete} disabled={deleting} className="p-1.5 rounded-lg text-text-muted hover:text-status-error hover:bg-status-error/10 transition-colors disabled:opacity-50" title="Supprimer">
          {deleting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
        </button>
      </div>
    </div>
  );
}

// ─── Main ─────────────────────────────────────────────────────────────────────

export default function BonsDeLivraisonClient() {
  const [items,     setItems]     = useState<BonDeLivraisonRow[]>([]);
  const [loading,   setLoading]   = useState(true);
  const [search,    setSearch]    = useState("");
  const [showModal, setShowModal] = useState<"create" | BonDeLivraisonRow | null>(null);
  const [saving,    setSaving]    = useState(false);
  const [deleting,  setDeleting]  = useState<string | null>(null);
  const [error,     setError]     = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true); setError(null);
    try {
      const res  = await fetch("/api/bons-de-livraison");
      const data = await res.json() as { bons_de_livraison?: BonDeLivraisonRow[]; error?: string };
      if (data.error) throw new Error(data.error);
      setItems(data.bons_de_livraison ?? []);
    } catch (e) { setError(e instanceof Error ? e.message : "Erreur"); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    if (!q) return items;
    return items.filter((i) => i.numero?.toLowerCase().includes(q) || i.client_nom.toLowerCase().includes(q) || i.objet.toLowerCase().includes(q));
  }, [items, search]);

  const formToPayload = (form: BonLivraisonFormState) => ({
    numero: form.numero.trim() || undefined,
    client_nom: form.client_nom.trim(), client_email: form.client_email.trim() || null,
    objet: form.objet.trim(), date_emission: form.date_emission,
    date_livraison: form.date_livraison || null, statut: form.statut,
    notes: form.notes.trim() || null,
    lignes: form.lignes.map((l) => ({
      id: l.id, description: l.description,
      quantite: parseFloat(l.quantite) || 1, unite: l.unite, reference: l.reference,
    })),
  });

  const handleCreate = async (form: BonLivraisonFormState) => {
    setSaving(true);
    try {
      const res  = await fetch("/api/bons-de-livraison", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(formToPayload(form)) });
      const data = await res.json() as { bon_de_livraison?: BonDeLivraisonRow; error?: string };
      if (data.error) throw new Error(data.error);
      setItems((prev) => [data.bon_de_livraison!, ...prev]);
      setShowModal(null);
    } catch (e) { setError(e instanceof Error ? e.message : "Erreur"); }
    finally { setSaving(false); }
  };

  const handleEdit = async (form: BonLivraisonFormState) => {
    if (typeof showModal !== "object" || showModal === null) return;
    const id = showModal.id;
    setSaving(true);
    try {
      const res  = await fetch(`/api/bons-de-livraison/${id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(formToPayload(form)) });
      const data = await res.json() as { bon_de_livraison?: BonDeLivraisonRow; error?: string };
      if (data.error) throw new Error(data.error);
      setItems((prev) => prev.map((i) => (i.id === id ? data.bon_de_livraison! : i)));
      setShowModal(null);
    } catch (e) { setError(e instanceof Error ? e.message : "Erreur"); }
    finally { setSaving(false); }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Supprimer ce bon de livraison ?")) return;
    setDeleting(id);
    try {
      const res = await fetch(`/api/bons-de-livraison/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Erreur suppression");
      setItems((prev) => prev.filter((i) => i.id !== id));
    } catch (e) { setError(e instanceof Error ? e.message : "Erreur"); }
    finally { setDeleting(null); }
  };

  const editInitial = (item: BonDeLivraisonRow): BonLivraisonFormState => ({
    numero: item.numero ?? "", client_nom: item.client_nom, client_email: item.client_email ?? "",
    objet: item.objet, date_emission: item.date_emission, date_livraison: item.date_livraison ?? "",
    statut: item.statut, notes: item.notes ?? "",
    lignes: (item.lignes as unknown as Record<string, unknown>[]).length > 0
      ? (item.lignes as unknown as Record<string, unknown>[]).map((l) => ({
          id: (l.id as string) ?? crypto.randomUUID(), description: (l.description as string) ?? "",
          quantite: String(l.quantite ?? 1), unite: (l.unite as string) ?? "",
          reference: (l.reference as string) ?? "",
        }))
      : [newLigne()],
  });

  return (
    <>
      <div className="min-h-screen bg-background">
        <div className="border-b border-surface-border bg-background px-6 py-5">
          <div className="max-w-4xl mx-auto flex items-center justify-between gap-4">
            <div>
              <h1 className="text-xl font-bold text-text-primary flex items-center gap-2">
                <Truck className="w-5 h-5 text-primary" /> Bons de livraison
              </h1>
              <p className="text-xs text-text-muted mt-0.5">{items.length} bon{items.length !== 1 ? "s" : ""} de livraison</p>
            </div>
            <button onClick={() => setShowModal("create")} className="flex items-center gap-2 px-4 py-2 rounded-xl bg-primary text-background text-sm font-semibold hover:bg-primary-400 transition-colors">
              <Plus className="w-4 h-4" /> Nouveau bon
            </button>
          </div>
        </div>

        <div className="max-w-4xl mx-auto px-6 py-6">
          {error && <div className="flex items-center gap-2 px-4 py-3 rounded-xl bg-status-error/10 border border-status-error/20 text-status-error text-sm mb-5"><AlertCircle className="w-4 h-4 flex-shrink-0" />{error}</div>}
          <div className="relative mb-6">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
            <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Rechercher un numéro, client, objet…" className="input-field w-full text-sm pl-9" />
            {search && <button type="button" onClick={() => setSearch("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted hover:text-text-primary transition-colors"><X className="w-4 h-4" /></button>}
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-20 gap-3 text-text-muted"><Loader2 className="w-5 h-5 animate-spin" /><span className="text-sm">Chargement…</span></div>
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 gap-4 text-text-muted">
              <div className="w-16 h-16 rounded-2xl bg-surface flex items-center justify-center border border-surface-border"><Truck className="w-7 h-7 opacity-40" /></div>
              <div className="text-center">
                <p className="text-sm font-semibold text-text-primary">{search ? "Aucun résultat" : "Aucun bon de livraison"}</p>
                <p className="text-xs text-text-muted mt-1">{search ? "Essayez un autre terme" : "Créez vos bons de livraison pour documenter vos expéditions"}</p>
              </div>
              {!search && <button onClick={() => setShowModal("create")} className="flex items-center gap-2 px-4 py-2 rounded-xl bg-primary text-background text-sm font-semibold hover:bg-primary-400 transition-colors mt-1"><Plus className="w-4 h-4" /> Créer un bon de livraison</button>}
            </div>
          ) : (
            <div className="space-y-2">
              {filtered.map((item) => <BonLivraisonRow key={item.id} item={item} onEdit={() => setShowModal(item)} onDelete={() => handleDelete(item.id)} deleting={deleting === item.id} />)}
            </div>
          )}
        </div>
      </div>

      {showModal === "create" && <BonLivraisonModal initial={EMPTY_FORM()} title="Nouveau bon de livraison" onClose={() => setShowModal(null)} onSubmit={handleCreate} saving={saving} />}
      {showModal !== null && showModal !== "create" && <BonLivraisonModal initial={editInitial(showModal)} title="Modifier le bon de livraison" onClose={() => setShowModal(null)} onSubmit={handleEdit} saving={saving} />}
    </>
  );
}
