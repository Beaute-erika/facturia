"use client";

import { useState, useMemo, useCallback, useEffect } from "react";
import {
  FilePlus2, Plus, Search, Pencil, Trash2, Loader2, X,
  AlertCircle, ChevronDown, Download, ArrowRight,
} from "lucide-react";
import { clsx } from "clsx";
import type { FactureProFormaRow, LigneDevis } from "@/lib/database.types";
import { createBrowserClient } from "@/lib/supabase-client";
import { generateDocumentPDF } from "@/lib/pdf-documents";

// ─── Types ────────────────────────────────────────────────────────────────────

interface LigneForm {
  id:            string;
  description:   string;
  quantite:      string;
  unite:         string;
  prix_unitaire: string;
}

interface ProFormaFormState {
  numero:        string;
  client_nom:    string;
  client_email:  string;
  objet:         string;
  date_emission: string;
  date_validite: string;
  taux_tva:      string;
  statut:        FactureProFormaRow["statut"];
  notes:         string;
  lignes:        LigneForm[];
}

const today = () => new Date().toISOString().split("T")[0];

const newLigne = (): LigneForm => ({
  id: crypto.randomUUID(),
  description: "", quantite: "1", unite: "", prix_unitaire: "",
});

const EMPTY_FORM = (): ProFormaFormState => ({
  numero: "", client_nom: "", client_email: "", objet: "",
  date_emission: today(), date_validite: "", taux_tva: "20",
  statut: "brouillon", notes: "", lignes: [newLigne()],
});

const fmt = (n: number) =>
  n.toLocaleString("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const parseNum = (s: string) => parseFloat(s.replace(",", ".")) || 0;

function computeTotals(lignes: LigneForm[], taux_tva: string) {
  const ht = lignes.reduce((a, l) => a + parseNum(l.quantite) * parseNum(l.prix_unitaire), 0);
  const tva = ht * (parseNum(taux_tva) / 100);
  return { montant_ht: ht, montant_tva: tva, montant_ttc: ht + tva };
}

const STATUT_LABELS: Record<FactureProFormaRow["statut"], string> = {
  brouillon: "Brouillon", envoye: "Envoyé", accepte: "Accepté",
  refuse: "Refusé", expire: "Expiré",
};

const STATUT_COLORS: Record<FactureProFormaRow["statut"], string> = {
  brouillon: "bg-surface-active text-text-secondary",
  envoye:    "bg-primary/20 text-primary",
  accepte:   "bg-status-success/20 text-status-success",
  refuse:    "bg-status-error/20 text-status-error",
  expire:    "bg-status-warning/20 text-status-warning",
};

// ─── Modal ────────────────────────────────────────────────────────────────────

interface ModalProps {
  initial: ProFormaFormState;
  title: string;
  onClose: () => void;
  onSubmit: (form: ProFormaFormState) => Promise<void>;
  saving: boolean;
}

function ProFormaModal({ initial, title, onClose, onSubmit, saving }: ModalProps) {
  const [form, setForm] = useState<ProFormaFormState>(initial);
  const [errors, setErrors] = useState<Partial<Record<string, string>>>({});

  const set = <K extends keyof ProFormaFormState>(field: K, value: ProFormaFormState[K]) =>
    setForm((f) => ({ ...f, [field]: value }));

  const setLigne = (id: string, field: keyof LigneForm, value: string) =>
    setForm((f) => ({ ...f, lignes: f.lignes.map((l) => l.id === id ? { ...l, [field]: value } : l) }));

  const addLigne    = () => setForm((f) => ({ ...f, lignes: [...f.lignes, newLigne()] }));
  const removeLigne = (id: string) => setForm((f) => ({ ...f, lignes: f.lignes.filter((l) => l.id !== id) }));

  const totals = useMemo(() => computeTotals(form.lignes, form.taux_tva), [form.lignes, form.taux_tva]);

  const validate = () => {
    const e: Partial<Record<string, string>> = {};
    if (!form.client_nom.trim()) e.client_nom = "Requis";
    if (!form.objet.trim())      e.objet = "Requis";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <form
        onSubmit={async (e) => { e.preventDefault(); if (validate()) await onSubmit(form); }}
        className="relative z-10 w-full max-w-2xl flex flex-col bg-surface border border-surface-border rounded-2xl shadow-card max-h-[90vh] overflow-hidden"
      >
        <div className="flex items-center justify-between px-6 py-4 border-b border-surface-border flex-shrink-0">
          <div className="flex items-center gap-2">
            <FilePlus2 className="w-4 h-4 text-primary" />
            <h2 className="text-base font-bold text-text-primary">{title}</h2>
          </div>
          <button type="button" onClick={onClose} className="p-1.5 rounded-xl text-text-muted hover:text-text-primary hover:bg-surface-active transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="overflow-y-auto px-6 py-5 space-y-4">
          {/* Numéro + Date émission */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="field-label">Numéro <span className="text-text-muted font-normal">(optionnel)</span></label>
              <input autoFocus value={form.numero} onChange={(e) => set("numero", e.target.value)} placeholder="PF-001" className="input-field w-full text-sm mt-1" />
            </div>
            <div>
              <label className="field-label">Date d&apos;émission</label>
              <input type="date" value={form.date_emission} onChange={(e) => set("date_emission", e.target.value)} className="input-field w-full text-sm mt-1" />
            </div>
          </div>

          {/* Client */}
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

          {/* Objet */}
          <div>
            <label className="field-label">Objet <span className="text-status-error">*</span></label>
            <input value={form.objet} onChange={(e) => set("objet", e.target.value)} placeholder="Objet de la pro forma…" className={clsx("input-field w-full text-sm mt-1", errors.objet && "border-status-error")} />
            {errors.objet && <p className="text-xs text-status-error mt-1">{errors.objet}</p>}
          </div>

          {/* Lignes */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="field-label mb-0">Lignes</label>
              <button type="button" onClick={addLigne} className="flex items-center gap-1 text-xs text-primary hover:text-primary-400 font-medium transition-colors">
                <Plus className="w-3 h-3" /> Ajouter
              </button>
            </div>
            <div className="space-y-2">
              {form.lignes.map((ligne) => (
                <div key={ligne.id} className="grid grid-cols-[1fr_80px_80px_90px_32px] gap-2 items-start">
                  <input value={ligne.description} onChange={(e) => setLigne(ligne.id, "description", e.target.value)} placeholder="Description" className="input-field text-sm" />
                  <input type="number" min={0} step={0.01} value={ligne.quantite} onChange={(e) => setLigne(ligne.id, "quantite", e.target.value)} placeholder="Qté" className="input-field text-sm" />
                  <input value={ligne.unite} onChange={(e) => setLigne(ligne.id, "unite", e.target.value)} placeholder="Unité" className="input-field text-sm" />
                  <div className="relative">
                    <input type="number" min={0} step={0.01} value={ligne.prix_unitaire} onChange={(e) => setLigne(ligne.id, "prix_unitaire", e.target.value)} placeholder="P.U. HT" className="input-field text-sm pr-5 w-full" />
                    <span className="absolute right-2 top-1/2 -translate-y-1/2 text-text-muted text-xs">€</span>
                  </div>
                  <button type="button" onClick={() => removeLigne(ligne.id)} disabled={form.lignes.length === 1} className="w-8 h-8 flex items-center justify-center rounded-lg text-text-muted hover:text-status-error hover:bg-status-error/10 transition-colors disabled:opacity-30">
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
              <input type="number" min={0} max={100} step={0.1} value={form.taux_tva} onChange={(e) => set("taux_tva", e.target.value)} className="input-field w-full text-sm mt-1" />
            </div>
            <div className="flex-1 bg-surface-active rounded-xl p-3 text-sm space-y-1 mt-1">
              <div className="flex justify-between text-text-muted"><span>Total HT</span><span className="font-mono">{fmt(totals.montant_ht)} €</span></div>
              <div className="flex justify-between text-text-muted"><span>TVA ({form.taux_tva}%)</span><span className="font-mono">{fmt(totals.montant_tva)} €</span></div>
              <div className="flex justify-between font-semibold text-text-primary border-t border-surface-border pt-1 mt-1"><span>Total TTC</span><span className="font-mono">{fmt(totals.montant_ttc)} €</span></div>
            </div>
          </div>

          {/* Date validité + Statut */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="field-label">Date de validité <span className="text-text-muted font-normal">(optionnel)</span></label>
              <input type="date" value={form.date_validite} onChange={(e) => set("date_validite", e.target.value)} className="input-field w-full text-sm mt-1" />
            </div>
            <div>
              <label className="field-label">Statut</label>
              <div className="relative mt-1">
                <select value={form.statut} onChange={(e) => set("statut", e.target.value as ProFormaFormState["statut"])} className="input-field w-full text-sm appearance-none pr-8">
                  <option value="brouillon">Brouillon</option>
                  <option value="envoye">Envoyé</option>
                  <option value="accepte">Accepté</option>
                  <option value="refuse">Refusé</option>
                  <option value="expire">Expiré</option>
                </select>
                <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-text-muted pointer-events-none" />
              </div>
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className="field-label">Notes <span className="text-text-muted font-normal">(optionnel)</span></label>
            <textarea value={form.notes} onChange={(e) => set("notes", e.target.value)} rows={3} placeholder="Informations complémentaires…" className="input-field w-full text-sm resize-none leading-relaxed mt-1" />
          </div>
        </div>

        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-surface-border flex-shrink-0">
          <button type="button" onClick={onClose} className="px-4 py-2 rounded-xl text-sm font-medium text-text-muted hover:text-text-primary hover:bg-surface-active transition-colors">Annuler</button>
          <button type="submit" disabled={saving} className="flex items-center gap-2 px-5 py-2 rounded-xl bg-primary text-background text-sm font-semibold hover:bg-primary-400 transition-colors disabled:opacity-50">
            {saving && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
            Enregistrer
          </button>
        </div>
      </form>
    </div>
  );
}

// ─── Row ──────────────────────────────────────────────────────────────────────

function ProFormaRow({ item, onEdit, onDelete, onPdf, onConvert, deleting, converting }: {
  item: FactureProFormaRow; onEdit: () => void; onDelete: () => void;
  onPdf: () => void; onConvert: () => void;
  deleting: boolean; converting: boolean;
}) {
  return (
    <div className="group flex items-center gap-4 px-4 py-3 bg-background border border-surface-border rounded-xl hover:border-primary/30 transition-colors">
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <p className="text-sm font-semibold text-text-primary">{item.numero || "—"}</p>
          <span className={clsx("text-[10px] font-bold px-2 py-0.5 rounded-full", STATUT_COLORS[item.statut])}>
            {STATUT_LABELS[item.statut]}
          </span>
        </div>
        <p className="text-xs text-text-muted mt-0.5 truncate">{item.client_nom} — {item.objet}</p>
        {item.date_validite && (
          <p className="text-[10px] text-text-muted mt-0.5">Valide jusqu&apos;au {new Date(item.date_validite).toLocaleDateString("fr-FR")}</p>
        )}
      </div>
      <div className="text-right flex-shrink-0">
        <p className="text-sm font-bold font-mono text-text-primary">{fmt(item.montant_ttc)} €</p>
        <p className="text-[10px] text-text-muted">{new Date(item.date_emission).toLocaleDateString("fr-FR")}</p>
      </div>
      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
        <button type="button" onClick={onPdf} className="p-1.5 rounded-lg text-text-muted hover:text-primary hover:bg-primary/10 transition-colors" title="Télécharger PDF"><Download className="w-3.5 h-3.5" /></button>
        <button type="button" onClick={onConvert} disabled={converting || item.statut === "accepte"} className="p-1.5 rounded-lg text-text-muted hover:text-status-success hover:bg-status-success/10 transition-colors disabled:opacity-40" title="Convertir en facture">
          {converting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <ArrowRight className="w-3.5 h-3.5" />}
        </button>
        <button type="button" onClick={onEdit} className="p-1.5 rounded-lg text-text-muted hover:text-primary hover:bg-primary/10 transition-colors" title="Modifier"><Pencil className="w-3.5 h-3.5" /></button>
        <button type="button" onClick={onDelete} disabled={deleting} className="p-1.5 rounded-lg text-text-muted hover:text-status-error hover:bg-status-error/10 transition-colors disabled:opacity-50" title="Supprimer">
          {deleting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
        </button>
      </div>
    </div>
  );
}

// ─── Main ─────────────────────────────────────────────────────────────────────

export default function FacturesProFormaClient() {
  const [items,      setItems]      = useState<FactureProFormaRow[]>([]);
  const [loading,    setLoading]    = useState(true);
  const [search,     setSearch]     = useState("");
  const [showModal,  setShowModal]  = useState<"create" | FactureProFormaRow | null>(null);
  const [saving,     setSaving]     = useState(false);
  const [deleting,   setDeleting]   = useState<string | null>(null);
  const [converting, setConverting] = useState<string | null>(null);
  const [error,      setError]      = useState<string | null>(null);
  const [toast,      setToast]      = useState<string | null>(null);
  const [artisan,    setArtisan]    = useState<{ nom: string; adresse?: string; siret?: string; email?: string; tel?: string }>({ nom: "" });

  const showToast = (msg: string) => { setToast(msg); setTimeout(() => setToast(null), 3500); };

  useEffect(() => {
    const sb = createBrowserClient();
    sb.auth.getUser().then(({ data }) => {
      if (!data.user) return;
      sb.from("users").select("prenom, nom, adresse, siret, email, tel").eq("id", data.user.id).single()
        .then(({ data: u }) => { if (u) setArtisan({ nom: `${u.prenom} ${u.nom}`, adresse: u.adresse ?? undefined, siret: u.siret ?? undefined, email: u.email, tel: u.tel ?? undefined }); });
    });
  }, []);

  const load = useCallback(async () => {
    setLoading(true); setError(null);
    try {
      const res  = await fetch("/api/factures-pro-forma");
      const data = await res.json() as { factures_pro_forma?: FactureProFormaRow[]; error?: string };
      if (data.error) throw new Error(data.error);
      setItems(data.factures_pro_forma ?? []);
    } catch (e) { setError(e instanceof Error ? e.message : "Erreur"); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    if (!q) return items;
    return items.filter((i) => i.numero?.toLowerCase().includes(q) || i.client_nom.toLowerCase().includes(q) || i.objet.toLowerCase().includes(q));
  }, [items, search]);

  const formToPayload = (form: ProFormaFormState) => {
    const totals = computeTotals(form.lignes, form.taux_tva);
    return {
      numero:        form.numero.trim() || undefined,
      client_nom:    form.client_nom.trim(),
      client_email:  form.client_email.trim() || null,
      objet:         form.objet.trim(),
      date_emission: form.date_emission,
      date_validite: form.date_validite || null,
      taux_tva:      parseNum(form.taux_tva),
      montant_ht:    totals.montant_ht,
      montant_tva:   totals.montant_tva,
      montant_ttc:   totals.montant_ttc,
      statut:        form.statut,
      notes:         form.notes.trim() || null,
      lignes:        form.lignes.map((l) => ({
        id: l.id, description: l.description, quantite: parseNum(l.quantite),
        unite: l.unite, prix_unitaire: parseNum(l.prix_unitaire),
        tva: parseNum(form.taux_tva), total_ht: parseNum(l.quantite) * parseNum(l.prix_unitaire),
      })),
    };
  };

  const handleCreate = async (form: ProFormaFormState) => {
    setSaving(true);
    try {
      const res  = await fetch("/api/factures-pro-forma", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(formToPayload(form)) });
      const data = await res.json() as { facture_pro_forma?: FactureProFormaRow; error?: string };
      if (data.error) throw new Error(data.error);
      setItems((prev) => [data.facture_pro_forma!, ...prev]);
      setShowModal(null);
    } catch (e) { setError(e instanceof Error ? e.message : "Erreur"); }
    finally { setSaving(false); }
  };

  const handleEdit = async (form: ProFormaFormState) => {
    if (typeof showModal !== "object" || showModal === null) return;
    const id = showModal.id;
    setSaving(true);
    try {
      const res  = await fetch(`/api/factures-pro-forma/${id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(formToPayload(form)) });
      const data = await res.json() as { facture_pro_forma?: FactureProFormaRow; error?: string };
      if (data.error) throw new Error(data.error);
      setItems((prev) => prev.map((i) => (i.id === id ? data.facture_pro_forma! : i)));
      setShowModal(null);
    } catch (e) { setError(e instanceof Error ? e.message : "Erreur"); }
    finally { setSaving(false); }
  };

  const handlePdf = (item: FactureProFormaRow) => {
    generateDocumentPDF({
      type: "Pro Forma",
      numero: item.numero ?? "PF",
      client_nom: item.client_nom,
      client_email: item.client_email,
      objet: item.objet,
      date: new Date(item.date_emission).toLocaleDateString("fr-FR"),
      notes: item.notes,
      lignes: item.lignes as LigneDevis[],
      montant_ht: item.montant_ht,
      montant_tva: item.montant_tva,
      montant_ttc: item.montant_ttc,
      artisan,
    });
  };

  const handleConvert = async (item: FactureProFormaRow) => {
    if (!confirm(`Convertir "${item.numero}" en facture ?`)) return;
    setConverting(item.id);
    try {
      const res = await fetch("/api/documents/convert/proforma-to-facture", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pro_forma_id: item.id }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error);
      setItems((prev) => prev.map((i) => i.id === item.id ? { ...i, statut: "accepte" as const } : i));
      showToast(`Facture ${json.numero} créée avec succès`);
    } catch (e) { setError(e instanceof Error ? e.message : "Erreur"); }
    finally { setConverting(null); }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Supprimer cette pro forma ?")) return;
    setDeleting(id);
    try {
      const res = await fetch(`/api/factures-pro-forma/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Erreur suppression");
      setItems((prev) => prev.filter((i) => i.id !== id));
    } catch (e) { setError(e instanceof Error ? e.message : "Erreur"); }
    finally { setDeleting(null); }
  };

  const editInitial = (item: FactureProFormaRow): ProFormaFormState => ({
    numero: item.numero ?? "", client_nom: item.client_nom, client_email: item.client_email ?? "",
    objet: item.objet, date_emission: item.date_emission, date_validite: item.date_validite ?? "",
    taux_tva: String(item.taux_tva), statut: item.statut, notes: item.notes ?? "",
    lignes: (item.lignes as unknown as Record<string, unknown>[]).length > 0
      ? (item.lignes as unknown as Record<string, unknown>[]).map((l) => ({
          id: (l.id as string) ?? crypto.randomUUID(), description: (l.description as string) ?? "",
          quantite: String(l.quantite ?? 1), unite: (l.unite as string) ?? "", prix_unitaire: String(l.prix_unitaire ?? ""),
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
                <FilePlus2 className="w-5 h-5 text-primary" /> Factures pro forma
              </h1>
              <p className="text-xs text-text-muted mt-0.5">
                {items.length} pro forma — devis prévisionnels non comptables
              </p>
            </div>
            <button onClick={() => setShowModal("create")} className="flex items-center gap-2 px-4 py-2 rounded-xl bg-primary text-background text-sm font-semibold hover:bg-primary-400 transition-colors">
              <Plus className="w-4 h-4" /> Nouvelle pro forma
            </button>
          </div>
        </div>

        <div className="max-w-4xl mx-auto px-6 py-6">
          {error && (
            <div className="flex items-center gap-2 px-4 py-3 rounded-xl bg-status-error/10 border border-status-error/20 text-status-error text-sm mb-5">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />{error}
            </div>
          )}
          <div className="relative mb-6">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
            <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Rechercher un numéro, client, objet…" className="input-field w-full text-sm pl-9" />
            {search && <button type="button" onClick={() => setSearch("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted hover:text-text-primary transition-colors"><X className="w-4 h-4" /></button>}
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-20 gap-3 text-text-muted"><Loader2 className="w-5 h-5 animate-spin" /><span className="text-sm">Chargement…</span></div>
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 gap-4 text-text-muted">
              <div className="w-16 h-16 rounded-2xl bg-surface flex items-center justify-center border border-surface-border">
                <FilePlus2 className="w-7 h-7 opacity-40" />
              </div>
              <div className="text-center">
                <p className="text-sm font-semibold text-text-primary">{search ? "Aucun résultat" : "Aucune pro forma"}</p>
                <p className="text-xs text-text-muted mt-1">{search ? "Essayez un autre terme" : "Créez des devis prévisionnels non comptables"}</p>
              </div>
              {!search && (
                <button onClick={() => setShowModal("create")} className="flex items-center gap-2 px-4 py-2 rounded-xl bg-primary text-background text-sm font-semibold hover:bg-primary-400 transition-colors mt-1">
                  <Plus className="w-4 h-4" /> Créer une pro forma
                </button>
              )}
            </div>
          ) : (
            <div className="space-y-2">
              {filtered.map((item) => (
                <ProFormaRow key={item.id} item={item} onEdit={() => setShowModal(item)} onDelete={() => handleDelete(item.id)} onPdf={() => handlePdf(item)} onConvert={() => handleConvert(item)} deleting={deleting === item.id} converting={converting === item.id} />
              ))}
            </div>
          )}
        </div>
      </div>

      {showModal === "create" && <ProFormaModal initial={EMPTY_FORM()} title="Nouvelle pro forma" onClose={() => setShowModal(null)} onSubmit={handleCreate} saving={saving} />}
      {showModal !== null && showModal !== "create" && <ProFormaModal initial={editInitial(showModal)} title="Modifier la pro forma" onClose={() => setShowModal(null)} onSubmit={handleEdit} saving={saving} />}
      {toast && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 px-4 py-2 rounded-xl bg-surface border border-primary/30 text-sm font-medium text-text-primary shadow-card animate-fade-in">
          {toast}
        </div>
      )}
    </>
  );
}
