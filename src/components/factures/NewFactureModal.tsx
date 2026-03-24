"use client";

import { useState, useMemo, useEffect } from "react";
import { X, Plus, Trash2, User, UserPlus, ChevronDown, Loader2, Check } from "lucide-react";
import { clsx } from "clsx";

interface ClientOption {
  id: string;
  dbId?: string;
  label: string;
  email?: string;
  type: "particulier" | "professionnel";
}

interface Ligne {
  id: string;
  description: string;
  quantite: number;
  unite: string;
  prix_unitaire: number;
  tva: number;
}

export interface NewFactureResult {
  id: string;
  client: string;
  objet: string;
  montant: string;
  tva: string;
  total: string;
  date: string;
  echeance: string;
  status: "brouillon";
  chorus: false;
}

interface Props {
  onClose: () => void;
  onCreated: (facture: NewFactureResult) => void;
}

const FALLBACK_CLIENTS: ClientOption[] = [
  { id: "c1", label: "Sophie Girard", email: "sophie@example.fr", type: "particulier" },
  { id: "c2", label: "Famille Martin", email: "martin@example.fr", type: "particulier" },
  { id: "c3", label: "SCI Verdure", email: "sci@verdure.fr", type: "professionnel" },
];

const TVA_OPTIONS = [0, 5.5, 10, 20];
const UNITE_OPTIONS = ["u", "h", "m²", "ml", "forfait", "kg"];

const newLigne = (): Ligne => ({
  id: crypto.randomUUID(),
  description: "",
  quantite: 1,
  unite: "u",
  prix_unitaire: 0,
  tva: 10,
});

const fmt = (n: number) =>
  n.toLocaleString("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const todayISO = () => new Date().toISOString().split("T")[0];
const in30DaysISO = () => {
  const d = new Date();
  d.setDate(d.getDate() + 30);
  return d.toISOString().split("T")[0];
};

export default function NewFactureModal({ onClose, onCreated }: Props) {
  const [clients, setClients] = useState<ClientOption[]>(FALLBACK_CLIENTS);

  useEffect(() => {
    fetch("/api/clients")
      .then((r) => r.json())
      .then((data) => {
        if (!data.clients?.length) return;
        const opts: ClientOption[] = data.clients.map((c: { name: string; email: string; type: string; _uuid?: string; id: number }) => ({
          id: String(c.id),
          dbId: c._uuid,
          label: c.name,
          email: c.email || undefined,
          type: c.type === "Professionnel" || c.type === "Public" ? "professionnel" : "particulier",
        }));
        setClients(opts);
      })
      .catch(() => {/* garde FALLBACK_CLIENTS */});
  }, []);

  const [clientSearch, setClientSearch] = useState("");
  const [selectedClient, setSelectedClient] = useState<ClientOption | null>(null);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [showNewClient, setShowNewClient] = useState(false);
  const [newClientNom, setNewClientNom] = useState("");
  const [newClientEmail, setNewClientEmail] = useState("");
  const [newClientType, setNewClientType] = useState<"particulier" | "professionnel">("particulier");

  const [objet, setObjet] = useState("");
  const [dateEmission, setDateEmission] = useState(todayISO());
  const [dateEcheance, setDateEcheance] = useState(in30DaysISO());
  const [notes, setNotes] = useState("");
  const [lignes, setLignes] = useState<Ligne[]>([newLigne()]);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const filteredClients = useMemo(
    () => clients.filter((c) => c.label.toLowerCase().includes(clientSearch.toLowerCase())),
    [clients, clientSearch]
  );

  const confirmNewClient = () => {
    const nom = newClientNom.trim();
    if (!nom) return;
    const created: ClientOption = {
      id: `new-${Date.now()}`,
      label: nom,
      email: newClientEmail.trim() || undefined,
      type: newClientType,
    };
    setClients((prev) => [created, ...prev]);
    setSelectedClient(created);
    setShowNewClient(false);
    setNewClientNom("");
    setNewClientEmail("");
    setErrors((e) => ({ ...e, client: "" }));
  };

  const totals = useMemo(() => {
    const ht = lignes.reduce((s, l) => s + l.quantite * l.prix_unitaire, 0);
    const tva = lignes.reduce((s, l) => s + l.quantite * l.prix_unitaire * (l.tva / 100), 0);
    return { ht, tva, ttc: ht + tva };
  }, [lignes]);

  const updateLigne = (id: string, field: keyof Ligne, value: string | number) => {
    setLignes((prev) => prev.map((l) => (l.id === id ? { ...l, [field]: value } : l)));
  };

  const removeLigne = (id: string) => {
    setLignes((prev) => (prev.length > 1 ? prev.filter((l) => l.id !== id) : prev));
  };

  const validate = () => {
    const e: Record<string, string> = {};
    if (!selectedClient?.label) e.client = "Sélectionnez ou créez un client";
    if (!objet.trim()) e.objet = "L'objet est requis";
    if (lignes.some((l) => !l.description.trim())) e.lignes = "Toutes les lignes doivent avoir une description";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSave = async () => {
    if (!validate()) return;
    setSaving(true);
    setSaveError(null);

    const numero = `FAC-${new Date().getFullYear()}-${String(Math.floor(Math.random() * 900) + 100)}`;
    const clientLabel = selectedClient!.label;
    const dateFormatted = new Date(dateEmission).toLocaleDateString("fr-FR", { day: "2-digit", month: "short", year: "numeric" });
    const echeanceFormatted = new Date(dateEcheance).toLocaleDateString("fr-FR", { day: "2-digit", month: "short", year: "numeric" });

    try {
      const res = await fetch("/api/factures", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          client_nom: clientLabel,
          client_email: selectedClient?.email,
          client_id: selectedClient?.dbId ?? null,
          objet: objet.trim(),
          date_emission: dateEmission,
          date_echeance: dateEcheance,
          lignes: lignes.map((l) => ({
            id: l.id,
            description: l.description,
            quantite: l.quantite,
            unite: l.unite,
            prix_unitaire: l.prix_unitaire,
            tva: l.tva,
            total_ht: l.quantite * l.prix_unitaire,
          })),
          montant_ht: totals.ht,
          montant_tva: totals.tva,
          montant_ttc: totals.ttc,
          notes: notes.trim() || null,
          numero,
        }),
      });
      if (!res.ok && res.status !== 404) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body?.error || `Erreur serveur (${res.status})`);
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Erreur inconnue";
      // 404 = pas encore de handler POST → création locale uniquement
      if (!msg.includes("404")) {
        setSaving(false);
        setSaveError(msg);
        return;
      }
    }

    setSaving(false);
    const result: NewFactureResult = {
      id: numero,
      client: clientLabel,
      objet: objet.trim(),
      montant: `${fmt(totals.ht)} €`,
      tva: `${fmt(totals.tva)} €`,
      total: `${fmt(totals.ttc)} €`,
      date: dateFormatted,
      echeance: echeanceFormatted,
      status: "brouillon",
      chorus: false,
    };
    onCreated(result);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />

      <div className="relative z-10 w-full max-w-3xl max-h-[90vh] flex flex-col bg-surface border border-surface-border rounded-2xl shadow-card">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-surface-border flex-shrink-0">
          <div>
            <h2 className="text-lg font-bold text-text-primary">Nouvelle facture</h2>
            <p className="text-xs text-text-muted mt-0.5">Remplissez les informations ci-dessous</p>
          </div>
          <button onClick={onClose} className="p-2 rounded-xl text-text-muted hover:text-text-primary hover:bg-surface-active transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="overflow-y-auto flex-1 px-6 py-5 space-y-6">

          {/* Client */}
          <section>
            <label className="field-label flex items-center gap-1.5 mb-2">
              <User className="w-3.5 h-3.5" /> Client
            </label>
            {!showNewClient ? (
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setDropdownOpen((v) => !v)}
                  className={clsx("input-field w-full text-sm flex items-center justify-between text-left", errors.client && "border-status-error")}
                >
                  <span className={selectedClient ? "text-text-primary" : "text-text-muted"}>
                    {selectedClient ? selectedClient.label : "Sélectionner un client…"}
                  </span>
                  <ChevronDown className={clsx("w-4 h-4 text-text-muted transition-transform", dropdownOpen && "rotate-180")} />
                </button>
                {dropdownOpen && (
                  <div className="absolute top-full left-0 right-0 mt-1 z-20 bg-surface border border-surface-border rounded-xl shadow-card max-h-56 overflow-y-auto">
                    <div className="p-2 border-b border-surface-border">
                      <input autoFocus value={clientSearch} onChange={(e) => setClientSearch(e.target.value)} placeholder="Rechercher…" className="input-field w-full text-sm py-1.5" />
                    </div>
                    {filteredClients.length === 0 ? (
                      <p className="text-xs text-text-muted text-center py-3">Aucun résultat</p>
                    ) : filteredClients.map((c) => (
                      <button key={c.id} type="button"
                        onClick={() => { setSelectedClient(c); setDropdownOpen(false); setClientSearch(""); setErrors((e) => ({ ...e, client: "" })); }}
                        className="w-full flex items-center justify-between px-3 py-2.5 text-sm hover:bg-surface-active transition-colors text-left"
                      >
                        <div>
                          <p className="font-medium text-text-primary">{c.label}</p>
                          {c.email && <p className="text-xs text-text-muted">{c.email}</p>}
                        </div>
                        {selectedClient?.id === c.id && <Check className="w-4 h-4 text-primary" />}
                      </button>
                    ))}
                    <div className="p-2 border-t border-surface-border">
                      <button type="button" onClick={() => { setShowNewClient(true); setDropdownOpen(false); }}
                        className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-primary hover:bg-primary/10 transition-colors font-medium"
                      >
                        <UserPlus className="w-4 h-4" /> Créer un nouveau client
                      </button>
                    </div>
                  </div>
                )}
                {errors.client && <p className="text-xs text-status-error mt-1">{errors.client}</p>}
              </div>
            ) : (
              <div className="p-4 rounded-xl bg-background border border-surface-border space-y-3">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-semibold text-text-primary">Nouveau client</p>
                  <button type="button" onClick={() => setShowNewClient(false)} className="text-xs text-text-muted hover:text-text-primary transition-colors">Annuler</button>
                </div>
                <div className="flex gap-2">
                  {(["particulier", "professionnel"] as const).map((t) => (
                    <button key={t} type="button" onClick={() => setNewClientType(t)}
                      className={clsx("px-3 py-1.5 rounded-lg text-xs font-medium border transition-all capitalize", newClientType === t ? "border-primary/30 bg-primary/10 text-primary" : "border-surface-border text-text-muted hover:text-text-primary")}
                    >{t}</button>
                  ))}
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="field-label">{newClientType === "professionnel" ? "Raison sociale" : "Nom complet"}</label>
                    <input value={newClientNom} onChange={(e) => { setNewClientNom(e.target.value); setErrors((er) => ({ ...er, client: "" })); }} className={clsx("input-field w-full text-sm", errors.client && "border-status-error")} placeholder={newClientType === "professionnel" ? "SCI Verdure SARL" : "Jean Dupont"} />
                  </div>
                  <div>
                    <label className="field-label">Email</label>
                    <input type="email" value={newClientEmail} onChange={(e) => setNewClientEmail(e.target.value)} className="input-field w-full text-sm" placeholder="client@email.fr" />
                  </div>
                </div>
                {errors.client && <p className="text-xs text-status-error">{errors.client}</p>}
                <div className="flex justify-end">
                  <button type="button" onClick={confirmNewClient} disabled={!newClientNom.trim()}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary text-background text-xs font-semibold hover:bg-primary-400 transition-colors disabled:opacity-40"
                  >
                    <Check className="w-3.5 h-3.5" /> Ajouter ce client
                  </button>
                </div>
              </div>
            )}
          </section>

          {/* Metadata */}
          <section className="grid grid-cols-3 gap-4">
            <div className="col-span-3">
              <label className="field-label">Objet de la facture</label>
              <input value={objet} onChange={(e) => { setObjet(e.target.value); setErrors((er) => ({ ...er, objet: "" })); }}
                className={clsx("input-field w-full text-sm", errors.objet && "border-status-error")}
                placeholder="Ex : Installation chaudière à condensation"
              />
              {errors.objet && <p className="text-xs text-status-error mt-1">{errors.objet}</p>}
            </div>
            <div>
              <label className="field-label">Date d&apos;émission</label>
              <input type="date" value={dateEmission} onChange={(e) => setDateEmission(e.target.value)} className="input-field w-full text-sm" />
            </div>
            <div>
              <label className="field-label">Date d&apos;échéance</label>
              <input type="date" value={dateEcheance} onChange={(e) => setDateEcheance(e.target.value)} className="input-field w-full text-sm" />
            </div>
          </section>

          {/* Lines */}
          <section>
            <div className="flex items-center justify-between mb-2">
              <label className="field-label mb-0">Lignes de la facture</label>
              {errors.lignes && <p className="text-xs text-status-error">{errors.lignes}</p>}
            </div>
            <div className="rounded-xl border border-surface-border overflow-hidden">
              <div className="grid grid-cols-[1fr_60px_70px_90px_65px_80px_32px] gap-2 px-3 py-2 bg-background border-b border-surface-border">
                {["Description", "Qté", "Unité", "PU HT", "TVA", "Total HT", ""].map((h) => (
                  <span key={h} className="text-[10px] font-semibold text-text-muted uppercase tracking-wider">{h}</span>
                ))}
              </div>
              <div className="divide-y divide-surface-border">
                {lignes.map((l) => {
                  const totalHT = l.quantite * l.prix_unitaire;
                  return (
                    <div key={l.id} className="grid grid-cols-[1fr_60px_70px_90px_65px_80px_32px] gap-2 px-3 py-2 items-center">
                      <input value={l.description} onChange={(e) => updateLigne(l.id, "description", e.target.value)} placeholder="Description…" className="input-field text-xs py-1.5" />
                      <input type="number" min={0} step={0.5} value={l.quantite} onChange={(e) => updateLigne(l.id, "quantite", parseFloat(e.target.value) || 0)} className="input-field text-xs py-1.5 text-center font-mono" />
                      <select value={l.unite} onChange={(e) => updateLigne(l.id, "unite", e.target.value)} className="input-field text-xs py-1.5">
                        {UNITE_OPTIONS.map((u) => <option key={u}>{u}</option>)}
                      </select>
                      <input type="number" min={0} step={0.01} value={l.prix_unitaire} onChange={(e) => updateLigne(l.id, "prix_unitaire", parseFloat(e.target.value) || 0)} className="input-field text-xs py-1.5 text-right font-mono" />
                      <select value={l.tva} onChange={(e) => updateLigne(l.id, "tva", parseFloat(e.target.value))} className="input-field text-xs py-1.5">
                        {TVA_OPTIONS.map((t) => <option key={t} value={t}>{t}%</option>)}
                      </select>
                      <span className="text-xs font-mono text-right text-text-primary font-semibold">{fmt(totalHT)} €</span>
                      <button type="button" onClick={() => removeLigne(l.id)} disabled={lignes.length === 1}
                        className="p-1 rounded-lg text-text-muted hover:text-status-error hover:bg-status-error/10 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  );
                })}
              </div>
              <div className="px-3 py-2 border-t border-surface-border">
                <button type="button" onClick={() => setLignes((prev) => [...prev, newLigne()])}
                  className="flex items-center gap-1.5 text-xs text-primary hover:text-primary-400 font-medium transition-colors"
                >
                  <Plus className="w-3.5 h-3.5" /> Ajouter une ligne
                </button>
              </div>
            </div>
          </section>

          {/* Totals */}
          <section className="flex justify-end">
            <div className="w-64 space-y-1.5">
              <div className="flex justify-between text-sm text-text-secondary">
                <span>Total HT</span><span className="font-mono">{fmt(totals.ht)} €</span>
              </div>
              {TVA_OPTIONS.filter((t) => t > 0).map((rate) => {
                const base = lignes.filter((l) => l.tva === rate).reduce((s, l) => s + l.quantite * l.prix_unitaire, 0);
                if (base === 0) return null;
                return (
                  <div key={rate} className="flex justify-between text-xs text-text-muted">
                    <span>TVA {rate}%</span><span className="font-mono">{fmt(base * rate / 100)} €</span>
                  </div>
                );
              })}
              <div className="flex justify-between text-base font-bold text-text-primary border-t border-surface-border pt-2 mt-2">
                <span>Total TTC</span><span className="font-mono text-primary">{fmt(totals.ttc)} €</span>
              </div>
            </div>
          </section>

          {/* Notes */}
          <section>
            <label className="field-label">Notes (optionnel)</label>
            <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} placeholder="Conditions particulières, délais, remarques…" className="input-field w-full text-sm resize-none" />
          </section>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-surface-border flex-shrink-0">
          <div className="flex items-center gap-3">
            <button type="button" onClick={onClose} className="px-4 py-2 rounded-xl text-sm text-text-muted hover:text-text-primary hover:bg-surface-active transition-colors">
              Annuler
            </button>
            {saveError && <p className="text-xs text-status-error">{saveError}</p>}
          </div>
          <button type="button" onClick={handleSave} disabled={saving}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-primary text-background font-semibold text-sm hover:bg-primary-400 hover:shadow-glow transition-all disabled:opacity-60"
          >
            {saving ? <><Loader2 className="w-4 h-4 animate-spin" /> Enregistrement…</> : <><Check className="w-4 h-4" /> Enregistrer la facture</>}
          </button>
        </div>
      </div>
    </div>
  );
}
