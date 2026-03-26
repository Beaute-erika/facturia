"use client";

/**
 * EditFactureModal — Modification complète d'une facture existante.
 *
 * Charge les données complètes via GET /api/factures/[uuid],
 * pré-remplit le formulaire (lignes, montants, dates, client),
 * puis envoie un PATCH complet à la sauvegarde.
 * Les totaux sont recalculés en temps réel.
 */

import { useState, useMemo, useEffect } from "react";
import {
  X, Plus, Trash2, User, UserPlus, ChevronDown,
  Loader2, Check, AlertCircle, Package,
} from "lucide-react";
import ServicePickerModal from "@/components/services/ServicePickerModal";
import type { ServiceRow } from "@/lib/database.types";
import { clsx } from "clsx";

// ─── Types ────────────────────────────────────────────────────────────────────

type FactureStatus = "payée" | "envoyée" | "en retard" | "brouillon";

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

export interface EditFactureResult {
  id: string;      // numero (FAC-2024-xxx)
  client: string;
  objet: string;
  montant: string; // HT formaté
  tva: string;
  total: string;   // TTC formaté
  date: string;
  echeance: string;
  status: FactureStatus;
}

interface Props {
  factureUuid: string;
  factureNumero: string;
  onClose: () => void;
  onSaved: (result: EditFactureResult) => void;
}

// ─── Constantes ───────────────────────────────────────────────────────────────

const TVA_OPTIONS = [0, 5.5, 10, 20];
const UNITE_OPTIONS = ["u", "h", "m²", "ml", "forfait", "kg"];
const STATUS_OPTIONS: FactureStatus[] = ["brouillon", "envoyée", "en retard", "payée"];

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

// ─── Component ────────────────────────────────────────────────────────────────

export default function EditFactureModal({ factureUuid, factureNumero, onClose, onSaved }: Props) {
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [showServicePicker, setShowServicePicker] = useState(false);

  // Clients
  const [clients, setClients] = useState<ClientOption[]>([]);
  const [clientSearch, setClientSearch] = useState("");
  const [selectedClient, setSelectedClient] = useState<ClientOption | null>(null);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [showNewClient, setShowNewClient] = useState(false);
  const [newClientNom, setNewClientNom] = useState("");
  const [newClientEmail, setNewClientEmail] = useState("");
  const [newClientType, setNewClientType] = useState<"particulier" | "professionnel">("particulier");

  // Champs
  const [objet, setObjet] = useState("");
  const [statut, setStatut] = useState<FactureStatus>("brouillon");
  const [dateEmission, setDateEmission] = useState("");
  const [dateEcheance, setDateEcheance] = useState("");
  const [notes, setNotes] = useState("");
  const [conditionsPaiement, setConditionsPaiement] = useState("");
  const [remisePercent, setRemisePercent] = useState(0);
  const [acompte, setAcompte] = useState(0);
  const [lignes, setLignes] = useState<Ligne[]>([newLigne()]);

  // ── Chargement initial ────────────────────────────────────────────────────

  useEffect(() => {
    Promise.all([
      fetch(`/api/factures/${factureUuid}`).then((r) => r.json()),
      fetch("/api/clients").then((r) => r.json()).catch(() => ({ clients: [] })),
    ])
      .then(([factureData, clientsData]) => {
        if (factureData.error) {
          setLoadError(factureData.error);
          setLoading(false);
          return;
        }

        const f = factureData.facture;

        // Pré-remplir les champs
        setObjet(f.objet ?? "");
        setStatut((f.statut as FactureStatus) ?? "brouillon");
        setDateEmission(f.date_emission ?? "");
        setDateEcheance(f.date_echeance ?? "");
        setNotes(f.notes ?? "");
        setConditionsPaiement(f.conditions_paiement ?? "");
        setRemisePercent(Number(f.remise_percent ?? 0));
        setAcompte(Number(f.acompte ?? 0));
        setLignes(
          Array.isArray(f.lignes) && f.lignes.length > 0
            ? f.lignes.map((l: Ligne) => ({ ...l, id: l.id || crypto.randomUUID() }))
            : [newLigne()],
        );

        // Construire la liste clients
        const apiClients: ClientOption[] = (clientsData.clients ?? []).map(
          (c: { id: number; name: string; email: string; type: string; _uuid?: string }) => ({
            id: String(c.id),
            dbId: c._uuid,
            label: c.name,
            email: c.email || undefined,
            type:
              c.type === "Professionnel" || c.type === "Public"
                ? "professionnel"
                : "particulier",
          }),
        );

        // S'assurer que le client actuel est dans la liste et pré-sélectionné
        if (f.clients) {
          const c = f.clients;
          const clientName = c.prenom
            ? `${c.prenom} ${c.nom}`
            : c.raison_sociale || c.nom;
          const currentOption: ClientOption = {
            id: f.client_id,
            dbId: f.client_id,
            label: clientName,
            email: c.email || undefined,
            type: c.type === "professionnel" ? "professionnel" : "particulier",
          };
          if (!apiClients.some((opt) => opt.dbId === f.client_id)) {
            apiClients.unshift(currentOption);
          }
          setSelectedClient(currentOption);
        }

        setClients(apiClients);
        setLoading(false);
      })
      .catch((err) => {
        console.error("[EditFactureModal] load error", err);
        setLoadError("Impossible de charger les données de la facture");
        setLoading(false);
      });
  }, [factureUuid]);

  // ── Clients ───────────────────────────────────────────────────────────────

  const filteredClients = useMemo(
    () => clients.filter((c) => c.label.toLowerCase().includes(clientSearch.toLowerCase())),
    [clients, clientSearch],
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

  // ── Totaux recalculés en temps réel ──────────────────────────────────────

  const totals = useMemo(() => {
    const htBrut  = lignes.reduce((s, l) => s + l.quantite * l.prix_unitaire, 0);
    const remise  = htBrut * (remisePercent / 100);
    const htNet   = htBrut - remise;
    const df      = 1 - remisePercent / 100;
    const tva     = lignes.reduce(
      (s, l) => s + l.quantite * l.prix_unitaire * df * (l.tva / 100),
      0,
    );
    const ttc     = htNet + tva;
    const restant = Math.max(0, ttc - acompte);
    return { htBrut, remise, htNet, tva, ttc, restant };
  }, [lignes, remisePercent, acompte]);

  // ── Lignes ────────────────────────────────────────────────────────────────

  const updateLigne = (id: string, field: keyof Ligne, value: string | number) => {
    setLignes((prev) => prev.map((l) => (l.id === id ? { ...l, [field]: value } : l)));
  };

  const removeLigne = (id: string) => {
    setLignes((prev) => (prev.length > 1 ? prev.filter((l) => l.id !== id) : prev));
  };

  const addFromService = (service: ServiceRow) => {
    setLignes((prev) => [
      ...prev,
      {
        id:            crypto.randomUUID(),
        description:   service.description ? `${service.name}\n${service.description}` : service.name,
        quantite:      1,
        unite:         "u",
        prix_unitaire: service.price_ht,
        tva:           10,
      },
    ]);
  };

  // ── Validation ────────────────────────────────────────────────────────────

  const validate = () => {
    const e: Record<string, string> = {};
    if (!selectedClient?.label) e.client = "Sélectionnez ou créez un client";
    if (!objet.trim()) e.objet = "L'objet est requis";
    if (lignes.some((l) => !l.description.trim())) e.lignes = "Toutes les lignes doivent avoir une description";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  // ── Sauvegarde ────────────────────────────────────────────────────────────

  const handleSave = async () => {
    if (!validate()) return;
    setSaving(true);
    setSaveError(null);

    try {
      const res = await fetch(`/api/factures/${factureUuid}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          client_id: selectedClient?.dbId ?? null,
          objet: objet.trim(),
          statut,
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
          remise_percent: remisePercent,
          acompte,
          notes: notes.trim() || null,
          conditions_paiement: conditionsPaiement.trim() || null,
        }),
      });

      if (!res.ok) {
        const b = await res.json().catch(() => ({}));
        throw new Error(b?.error || `Erreur serveur (${res.status})`);
      }

      const result = await res.json();
      const saved = result.facture;

      onSaved({
        id: factureNumero,
        client: selectedClient!.label,
        objet: objet.trim(),
        montant: saved.montant ?? `${fmt(totals.htNet)} €`,
        tva: saved.tva ?? `${fmt(totals.tva)} €`,
        total: saved.total ?? `${fmt(totals.ttc)} €`,
        date: saved.date ?? "",
        echeance: saved.echeance ?? "",
        status: statut,
      });
      onClose();
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : "Erreur inconnue");
    } finally {
      setSaving(false);
    }
  };

  // ── États de chargement / erreur ─────────────────────────────────────────

  if (loading) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
        <div className="relative z-10 w-full max-w-3xl h-64 flex flex-col items-center justify-center bg-surface border border-surface-border rounded-2xl shadow-card gap-3">
          <Loader2 className="w-6 h-6 text-primary animate-spin" />
          <p className="text-sm text-text-muted">Chargement de la facture…</p>
        </div>
      </div>
    );
  }

  if (loadError) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
        <div className="relative z-10 w-full max-w-sm flex flex-col items-center justify-center bg-surface border border-surface-border rounded-2xl shadow-card p-8 gap-4">
          <AlertCircle className="w-8 h-8 text-status-error" />
          <p className="text-sm text-text-primary text-center">{loadError}</p>
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-surface-active text-sm text-text-muted hover:text-text-primary transition-colors"
          >
            Fermer
          </button>
        </div>
      </div>
    );
  }

  // ── Rendu principal ───────────────────────────────────────────────────────

  return (
    <>
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />

      <div className="relative z-10 w-full max-w-3xl max-h-[90vh] flex flex-col bg-surface border border-surface-border rounded-2xl shadow-card">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-surface-border flex-shrink-0">
          <div>
            <h2 className="text-lg font-bold text-text-primary">Modifier la facture</h2>
            <p className="text-xs text-text-muted font-mono mt-0.5">{factureNumero}</p>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-text-muted hover:text-text-primary hover:bg-surface-active transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="overflow-y-auto flex-1 px-6 py-5 space-y-6">

          {/* ── Client ── */}
          <section>
            <label className="field-label flex items-center gap-1.5 mb-2">
              <User className="w-3.5 h-3.5" /> Client
            </label>

            {!showNewClient ? (
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setDropdownOpen((v) => !v)}
                  className={clsx(
                    "input-field w-full text-sm flex items-center justify-between text-left",
                    errors.client && "border-status-error",
                  )}
                >
                  <span className={selectedClient ? "text-text-primary" : "text-text-muted"}>
                    {selectedClient ? selectedClient.label : "Sélectionner un client…"}
                  </span>
                  <ChevronDown className={clsx("w-4 h-4 text-text-muted transition-transform", dropdownOpen && "rotate-180")} />
                </button>

                {dropdownOpen && (
                  <div className="absolute top-full left-0 right-0 mt-1 z-20 bg-surface border border-surface-border rounded-xl shadow-card max-h-56 overflow-y-auto">
                    <div className="p-2 border-b border-surface-border">
                      <input
                        autoFocus
                        value={clientSearch}
                        onChange={(e) => setClientSearch(e.target.value)}
                        placeholder="Rechercher…"
                        className="input-field w-full text-sm py-1.5"
                      />
                    </div>
                    {filteredClients.length === 0 ? (
                      <p className="text-xs text-text-muted text-center py-3">Aucun résultat</p>
                    ) : filteredClients.map((c) => (
                      <button
                        key={c.id}
                        type="button"
                        onClick={() => {
                          setSelectedClient(c);
                          setDropdownOpen(false);
                          setClientSearch("");
                          setErrors((e) => ({ ...e, client: "" }));
                        }}
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
                      <button
                        type="button"
                        onClick={() => { setShowNewClient(true); setDropdownOpen(false); }}
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
                  <button
                    type="button"
                    onClick={() => setShowNewClient(false)}
                    className="text-xs text-text-muted hover:text-text-primary transition-colors"
                  >
                    Annuler
                  </button>
                </div>
                <div className="flex gap-2">
                  {(["particulier", "professionnel"] as const).map((t) => (
                    <button
                      key={t}
                      type="button"
                      onClick={() => setNewClientType(t)}
                      className={clsx(
                        "px-3 py-1.5 rounded-lg text-xs font-medium border transition-all capitalize",
                        newClientType === t
                          ? "border-primary/30 bg-primary/10 text-primary"
                          : "border-surface-border text-text-muted hover:text-text-primary",
                      )}
                    >
                      {t}
                    </button>
                  ))}
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="field-label">{newClientType === "professionnel" ? "Raison sociale" : "Nom complet"}</label>
                    <input
                      value={newClientNom}
                      onChange={(e) => { setNewClientNom(e.target.value); setErrors((er) => ({ ...er, client: "" })); }}
                      className={clsx("input-field w-full text-sm", errors.client && "border-status-error")}
                      placeholder={newClientType === "professionnel" ? "SCI Verdure SARL" : "Jean Dupont"}
                    />
                  </div>
                  <div>
                    <label className="field-label">Email</label>
                    <input
                      type="email"
                      value={newClientEmail}
                      onChange={(e) => setNewClientEmail(e.target.value)}
                      className="input-field w-full text-sm"
                      placeholder="client@email.fr"
                    />
                  </div>
                </div>
                {errors.client && <p className="text-xs text-status-error">{errors.client}</p>}
                <div className="flex justify-end">
                  <button
                    type="button"
                    onClick={confirmNewClient}
                    disabled={!newClientNom.trim()}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary text-background text-xs font-semibold hover:bg-primary-400 transition-colors disabled:opacity-40"
                  >
                    <Check className="w-3.5 h-3.5" /> Ajouter ce client
                  </button>
                </div>
              </div>
            )}
          </section>

          {/* ── Statut + Métadonnées ── */}
          <section className="grid grid-cols-3 gap-4">
            <div>
              <label className="field-label">Statut</label>
              <select
                value={statut}
                onChange={(e) => setStatut(e.target.value as FactureStatus)}
                className="input-field w-full text-sm"
              >
                {STATUS_OPTIONS.map((s) => (
                  <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>
                ))}
              </select>
            </div>
            <div className="col-span-2">
              <label className="field-label">Objet de la facture</label>
              <input
                value={objet}
                onChange={(e) => { setObjet(e.target.value); setErrors((er) => ({ ...er, objet: "" })); }}
                className={clsx("input-field w-full text-sm", errors.objet && "border-status-error")}
                placeholder="Ex : Installation chaudière à condensation"
              />
              {errors.objet && <p className="text-xs text-status-error mt-1">{errors.objet}</p>}
            </div>
            <div>
              <label className="field-label">Date d&apos;émission</label>
              <input
                type="date"
                value={dateEmission}
                onChange={(e) => setDateEmission(e.target.value)}
                className="input-field w-full text-sm"
              />
            </div>
            <div>
              <label className="field-label">Date d&apos;échéance</label>
              <input
                type="date"
                value={dateEcheance}
                onChange={(e) => setDateEcheance(e.target.value)}
                className="input-field w-full text-sm"
              />
            </div>
          </section>

          {/* ── Lignes ── */}
          <section>
            <div className="flex items-center justify-between mb-2">
              <label className="field-label mb-0">Lignes de la facture</label>
              {errors.lignes && <p className="text-xs text-status-error">{errors.lignes}</p>}
            </div>

            <div className="rounded-xl border border-surface-border overflow-hidden">
              {/* En-tête */}
              <div className="grid grid-cols-[1fr_60px_70px_90px_65px_80px_32px] gap-2 px-3 py-2 bg-background border-b border-surface-border">
                {["Description", "Qté", "Unité", "PU HT", "TVA", "Total HT", ""].map((h) => (
                  <span key={h} className="text-[10px] font-semibold text-text-muted uppercase tracking-wider">{h}</span>
                ))}
              </div>

              {/* Lignes */}
              <div className="divide-y divide-surface-border">
                {lignes.map((l) => {
                  const totalHT = l.quantite * l.prix_unitaire;
                  return (
                    <div
                      key={l.id}
                      className="grid grid-cols-[1fr_60px_70px_90px_65px_80px_32px] gap-2 px-3 py-2 items-center"
                    >
                      <input
                        value={l.description}
                        onChange={(e) => updateLigne(l.id, "description", e.target.value)}
                        placeholder="Description du travail…"
                        className="input-field text-xs py-1.5"
                      />
                      <input
                        type="number"
                        min={0}
                        step={0.5}
                        value={l.quantite}
                        onChange={(e) => updateLigne(l.id, "quantite", parseFloat(e.target.value) || 0)}
                        className="input-field text-xs py-1.5 text-center font-mono"
                      />
                      <select
                        value={l.unite}
                        onChange={(e) => updateLigne(l.id, "unite", e.target.value)}
                        className="input-field text-xs py-1.5"
                      >
                        {UNITE_OPTIONS.map((u) => <option key={u}>{u}</option>)}
                      </select>
                      <input
                        type="number"
                        min={0}
                        step={0.01}
                        value={l.prix_unitaire}
                        onChange={(e) => updateLigne(l.id, "prix_unitaire", parseFloat(e.target.value) || 0)}
                        className="input-field text-xs py-1.5 text-right font-mono"
                      />
                      <select
                        value={l.tva}
                        onChange={(e) => updateLigne(l.id, "tva", parseFloat(e.target.value))}
                        className="input-field text-xs py-1.5"
                      >
                        {TVA_OPTIONS.map((t) => <option key={t} value={t}>{t}%</option>)}
                      </select>
                      <span className="text-xs font-mono text-right text-text-primary font-semibold">
                        {fmt(totalHT)} €
                      </span>
                      <button
                        type="button"
                        onClick={() => removeLigne(l.id)}
                        disabled={lignes.length === 1}
                        className="p-1 rounded-lg text-text-muted hover:text-status-error hover:bg-status-error/10 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  );
                })}
              </div>

              {/* Ajouter une ligne */}
              <div className="px-3 py-2 border-t border-surface-border flex items-center gap-4">
                <button
                  type="button"
                  onClick={() => setLignes((prev) => [...prev, newLigne()])}
                  className="flex items-center gap-1.5 text-xs text-primary hover:text-primary-400 font-medium transition-colors"
                >
                  <Plus className="w-3.5 h-3.5" /> Ajouter une ligne
                </button>
                <button
                  type="button"
                  onClick={() => setShowServicePicker(true)}
                  className="flex items-center gap-1.5 text-xs text-text-muted hover:text-primary font-medium transition-colors"
                >
                  <Package className="w-3.5 h-3.5" /> Depuis mes services
                </button>
              </div>
            </div>
          </section>

          {/* ── Remise & Acompte ── */}
          <section className="grid grid-cols-2 gap-4">
            <div>
              <label className="field-label">Remise (%)</label>
              <div className="relative">
                <input
                  type="number"
                  min={0}
                  max={100}
                  step={0.5}
                  value={remisePercent}
                  onChange={(e) => setRemisePercent(Math.min(100, Math.max(0, parseFloat(e.target.value) || 0)))}
                  className="input-field w-full text-sm pr-7"
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted text-sm">%</span>
              </div>
            </div>
            <div>
              <label className="field-label">Acompte versé (€)</label>
              <div className="relative">
                <input
                  type="number"
                  min={0}
                  step={1}
                  value={acompte}
                  onChange={(e) => setAcompte(Math.max(0, parseFloat(e.target.value) || 0))}
                  className="input-field w-full text-sm pr-7"
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted text-sm">€</span>
              </div>
            </div>
          </section>

          {/* ── Totaux ── */}
          <section className="flex justify-end">
            <div className="w-72 space-y-1.5">
              <div className="flex justify-between text-sm text-text-secondary">
                <span>Total HT brut</span>
                <span className="font-mono">{fmt(totals.htBrut)} €</span>
              </div>
              {remisePercent > 0 && (
                <>
                  <div className="flex justify-between text-sm text-status-warning">
                    <span>Remise ({remisePercent}%)</span>
                    <span className="font-mono">−{fmt(totals.remise)} €</span>
                  </div>
                  <div className="flex justify-between text-sm text-text-secondary">
                    <span>Total HT net</span>
                    <span className="font-mono">{fmt(totals.htNet)} €</span>
                  </div>
                </>
              )}
              {TVA_OPTIONS.filter((t) => t > 0).map((rate) => {
                const df = 1 - remisePercent / 100;
                const base = lignes
                  .filter((l) => l.tva === rate)
                  .reduce((s, l) => s + l.quantite * l.prix_unitaire, 0) * df;
                if (base === 0) return null;
                return (
                  <div key={rate} className="flex justify-between text-xs text-text-muted">
                    <span>TVA {rate}%</span>
                    <span className="font-mono">{fmt(base * rate / 100)} €</span>
                  </div>
                );
              })}
              <div className="flex justify-between text-base font-bold text-text-primary border-t border-surface-border pt-2 mt-2">
                <span>Total TTC</span>
                <span className="font-mono text-primary">{fmt(totals.ttc)} €</span>
              </div>
              {acompte > 0 && (
                <>
                  <div className="flex justify-between text-sm text-text-muted">
                    <span>Acompte versé</span>
                    <span className="font-mono">−{fmt(acompte)} €</span>
                  </div>
                  <div className="flex justify-between text-sm font-bold text-text-primary border-t border-surface-border pt-2">
                    <span>Reste à payer</span>
                    <span className="font-mono text-status-warning">{fmt(totals.restant)} €</span>
                  </div>
                </>
              )}
            </div>
          </section>

          {/* ── Notes ── */}
          <section>
            <label className="field-label">Notes (optionnel)</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
              placeholder="Remarques, conditions particulières…"
              className="input-field w-full text-sm resize-none"
            />
          </section>

          {/* ── Conditions de paiement ── */}
          <section>
            <label className="field-label">Conditions de paiement (optionnel)</label>
            <textarea
              value={conditionsPaiement}
              onChange={(e) => setConditionsPaiement(e.target.value)}
              rows={2}
              placeholder="Ex : Paiement à 30 jours. Pénalités de retard : 3× taux légal."
              className="input-field w-full text-sm resize-none"
            />
          </section>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-surface-border flex-shrink-0">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-sm text-text-muted hover:text-text-primary hover:bg-surface-active transition-colors"
            >
              Annuler
            </button>
            {saveError && <p className="text-xs text-status-error">{saveError}</p>}
          </div>
          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-primary text-background font-semibold text-sm hover:bg-primary-400 hover:shadow-glow transition-all disabled:opacity-60"
          >
            {saving ? (
              <><Loader2 className="w-4 h-4 animate-spin" /> Enregistrement…</>
            ) : (
              <><Check className="w-4 h-4" /> Enregistrer les modifications</>
            )}
          </button>
        </div>
      </div>
    </div>

    {showServicePicker && (
      <ServicePickerModal
        onClose={() => setShowServicePicker(false)}
        onSelect={addFromService}
      />
    )}
    </>
  );
}
