"use client";

import { useState, useEffect } from "react";
import { X, Sparkles, ChevronRight, Loader2, CheckCircle2, User, Wrench, FileText, Euro, AlertCircle } from "lucide-react";
import { clsx } from "clsx";
import Button from "@/components/ui/Button";

interface AIGenerateModalProps {
  onClose: () => void;
  onGenerated: (devis: GeneratedDevis) => void;
}

export interface GeneratedDevis {
  id: string;
  client: string;
  objet: string;
  montant: string;
  date: string;
  validite: string;
  status: string;
  lignes: { designation: string; qte: number; unite: string; pu: number; tva: number }[];
}

type Step = "form" | "generating" | "preview";

const GENERATION_STEPS = [
  { label: "Analyse de la demande…", duration: 700 },
  { label: "Recherche des tarifs artisanat…", duration: 900 },
  { label: "Calcul des postes de travaux…", duration: 800 },
  { label: "Application des taux TVA…", duration: 600 },
  { label: "Rédaction des conditions…", duration: 500 },
  { label: "Devis prêt ✓", duration: 400 },
];

const CLIENTS = ["Sophie Girard", "Famille Martin", "Pierre Moreau", "SCI Verdure", "Mairie de Vanves", "Nouveau client…"];
const TYPES = ["Plomberie", "Chauffage", "Sanitaire", "Rénovation", "Dépannage", "Mise aux normes", "Installation"];

export default function AIGenerateModal({ onClose, onGenerated }: AIGenerateModalProps) {
  const [step, setStep] = useState<Step>("form");
  const [form, setForm] = useState({ client: "", type: "", description: "", budget: "" });
  const [genStep, setGenStep] = useState(0);
  const [generated, setGenerated] = useState<GeneratedDevis | null>(null);

  // Run generation animation
  useEffect(() => {
    if (step !== "generating") return;
    let i = 0;
    const run = () => {
      if (i >= GENERATION_STEPS.length) {
        const id = `DV-2024-${Math.floor(Math.random() * 900 + 100)}`;
        const today = new Date();
        const validity = new Date(today);
        validity.setDate(validity.getDate() + 30);
        const fmt = (d: Date) =>
          d.toLocaleDateString("fr-FR", { day: "2-digit", month: "short", year: "numeric" });

        const lignes = buildLignes(form.type, form.budget);
        const totalHT = lignes.reduce((s, l) => s + l.qte * l.pu, 0);

        const g: GeneratedDevis = {
          id,
          client: form.client || "Client à définir",
          objet: `${form.type} — ${form.description || "travaux divers"}`,
          montant: `${totalHT.toLocaleString("fr-FR")} €`,
          date: fmt(today),
          validite: fmt(validity),
          status: "brouillon",
          lignes,
        };
        setGenerated(g);
        setStep("preview");
        return;
      }
      setGenStep(i);
      setTimeout(() => {
        i++;
        run();
      }, GENERATION_STEPS[i].duration);
    };
    run();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step]);

  const canSubmit = form.client && form.type;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />

      {/* Panel */}
      <div className="relative w-full max-w-lg bg-background-secondary border border-surface-border rounded-2xl shadow-card overflow-hidden animate-fade-in">
        {/* Header */}
        <div className="flex items-center gap-3 px-5 py-4 border-b border-surface-border">
          <div className="w-8 h-8 rounded-xl bg-primary/10 flex items-center justify-center">
            <Sparkles className="w-4 h-4 text-primary" />
          </div>
          <div className="flex-1">
            <h2 className="font-semibold text-text-primary">Générer un devis avec l&apos;IA</h2>
            <p className="text-xs text-text-muted">Décrivez votre chantier, l&apos;IA fait le reste</p>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg text-text-muted hover:text-text-primary hover:bg-surface-hover transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="p-5">
          {step === "form" && (
            <div className="space-y-4 animate-fade-in">
              {/* Client */}
              <div>
                <label className="text-xs font-semibold text-text-muted uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                  <User className="w-3.5 h-3.5" /> Client
                </label>
                <select
                  value={form.client}
                  onChange={(e) => setForm({ ...form, client: e.target.value })}
                  className="input-field w-full text-sm"
                >
                  <option value="">Sélectionner un client…</option>
                  {CLIENTS.map((c) => <option key={c}>{c}</option>)}
                </select>
              </div>

              {/* Type */}
              <div>
                <label className="text-xs font-semibold text-text-muted uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                  <Wrench className="w-3.5 h-3.5" /> Type de travaux
                </label>
                <div className="flex flex-wrap gap-2">
                  {TYPES.map((t) => (
                    <button
                      key={t}
                      onClick={() => setForm({ ...form, type: t })}
                      className={clsx(
                        "px-3 py-1.5 rounded-lg text-xs font-medium border transition-all",
                        form.type === t
                          ? "bg-primary/10 border-primary/30 text-primary"
                          : "border-surface-border text-text-muted hover:text-text-primary hover:border-surface-active"
                      )}
                    >
                      {t}
                    </button>
                  ))}
                </div>
              </div>

              {/* Description */}
              <div>
                <label className="text-xs font-semibold text-text-muted uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                  <FileText className="w-3.5 h-3.5" /> Description (optionnel)
                </label>
                <textarea
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  placeholder="Ex: Remplacement chaudière gaz + robinetterie salle de bain + réglage radiateurs…"
                  rows={3}
                  className="input-field w-full text-sm resize-none"
                />
              </div>

              {/* Budget */}
              <div>
                <label className="text-xs font-semibold text-text-muted uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                  <Euro className="w-3.5 h-3.5" /> Budget estimé (optionnel)
                </label>
                <div className="relative">
                  <input
                    type="text"
                    value={form.budget}
                    onChange={(e) => setForm({ ...form, budget: e.target.value })}
                    placeholder="Ex: 3 500"
                    className="input-field w-full text-sm pr-8"
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted text-sm">€</span>
                </div>
              </div>

              {/* AI hint */}
              <div className="flex items-start gap-2.5 p-3 rounded-xl bg-primary/5 border border-primary/15">
                <Sparkles className="w-4 h-4 text-primary flex-shrink-0 mt-0.5" />
                <p className="text-xs text-text-muted leading-relaxed">
                  L&apos;IA décompose automatiquement les postes (main-d&apos;œuvre, fournitures, déplacement),
                  applique les taux TVA artisanat et rédige les conditions générales.
                </p>
              </div>

              <Button
                variant="primary"
                icon={Sparkles}
                disabled={!canSubmit}
                onClick={() => setStep("generating")}
                className="w-full justify-center"
              >
                Générer le devis
              </Button>
            </div>
          )}

          {step === "generating" && (
            <div className="py-6 animate-fade-in">
              <div className="flex justify-center mb-6">
                <div className="relative">
                  <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center">
                    <Sparkles className="w-8 h-8 text-primary" />
                  </div>
                  <div className="absolute inset-0 rounded-2xl border-2 border-primary/30 animate-ping" />
                </div>
              </div>
              <p className="text-center font-semibold text-text-primary mb-6">Génération en cours…</p>
              <div className="space-y-2">
                {GENERATION_STEPS.map((s, i) => (
                  <div key={i} className={clsx(
                    "flex items-center gap-3 px-4 py-2.5 rounded-xl transition-all duration-300",
                    i < genStep ? "opacity-50" : i === genStep ? "bg-primary/5 border border-primary/20" : "opacity-30"
                  )}>
                    {i < genStep ? (
                      <CheckCircle2 className="w-4 h-4 text-primary flex-shrink-0" />
                    ) : i === genStep ? (
                      <Loader2 className="w-4 h-4 text-primary flex-shrink-0 animate-spin" />
                    ) : (
                      <div className="w-4 h-4 rounded-full border border-surface-border flex-shrink-0" />
                    )}
                    <span className={clsx(
                      "text-sm",
                      i === genStep ? "text-text-primary font-medium" : "text-text-muted"
                    )}>
                      {s.label}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {step === "preview" && generated && (
            <div className="animate-fade-in space-y-4">
              <div className="flex items-center gap-2 p-3 rounded-xl bg-primary/5 border border-primary/20">
                <CheckCircle2 className="w-4 h-4 text-primary" />
                <p className="text-sm font-semibold text-primary">Devis généré avec succès !</p>
                <span className="ml-auto font-mono text-xs text-text-muted">{generated.id}</span>
              </div>

              {/* Preview table */}
              <div className="bg-background rounded-xl border border-surface-border overflow-hidden">
                <div className="px-4 py-2.5 border-b border-surface-border bg-surface/50">
                  <p className="text-xs font-semibold text-text-muted uppercase tracking-wider">Détail des postes</p>
                </div>
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-surface-border">
                      <th className="text-left px-4 py-2 text-xs text-text-muted">Désignation</th>
                      <th className="text-right px-4 py-2 text-xs text-text-muted">Qté</th>
                      <th className="text-right px-4 py-2 text-xs text-text-muted">P.U. HT</th>
                      <th className="text-right px-4 py-2 text-xs text-text-muted">Total HT</th>
                    </tr>
                  </thead>
                  <tbody>
                    {generated.lignes.map((l, i) => (
                      <tr key={i} className="border-b border-surface-border last:border-0">
                        <td className="px-4 py-2.5 text-text-primary">{l.designation}</td>
                        <td className="px-4 py-2.5 text-right text-text-muted font-mono">{l.qte} {l.unite}</td>
                        <td className="px-4 py-2.5 text-right text-text-muted font-mono">{l.pu.toLocaleString("fr-FR")} €</td>
                        <td className="px-4 py-2.5 text-right font-semibold font-mono text-text-primary">
                          {(l.qte * l.pu).toLocaleString("fr-FR")} €
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                <div className="px-4 py-3 bg-primary/5 border-t border-primary/20 flex justify-between items-center">
                  <span className="text-sm font-semibold text-text-muted">Total TTC (TVA 10%)</span>
                  <span className="text-base font-bold font-mono text-primary">
                    {(generated.lignes.reduce((s, l) => s + l.qte * l.pu, 0) * 1.1).toLocaleString("fr-FR")} €
                  </span>
                </div>
              </div>

              <div className="flex items-start gap-2 p-3 rounded-xl bg-surface-border/30">
                <AlertCircle className="w-4 h-4 text-status-warning flex-shrink-0 mt-0.5" />
                <p className="text-xs text-text-muted">
                  Vérifiez les montants avant d&apos;envoyer. L&apos;IA peut nécessiter des ajustements selon vos conditions réelles.
                </p>
              </div>

              <div className="flex gap-2 pt-1">
                <button
                  onClick={() => setStep("form")}
                  className="btn-ghost text-sm flex-1 text-center py-2 rounded-xl border border-surface-border"
                >
                  Modifier
                </button>
                <Button
                  variant="primary"
                  icon={ChevronRight}
                  onClick={() => onGenerated(generated)}
                  className="flex-1 justify-center"
                >
                  Ajouter au devis
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// Build realistic line items based on type
function buildLignes(type: string, budget: string) {
  const b = parseFloat(budget.replace(/[^0-9]/g, "")) || 0;
  const scale = b > 0 ? b / 5000 : 1;

  const templates: Record<string, { designation: string; qte: number; unite: string; pu: number; tva: number }[]> = {
    Plomberie: [
      { designation: "Main-d'œuvre plombier (taux horaire)", qte: Math.round(8 * scale), unite: "h", pu: 65, tva: 10 },
      { designation: "Fournitures et robinetterie", qte: 1, unite: "forfait", pu: Math.round(350 * scale), tva: 20 },
      { designation: "Déplacement et transport", qte: 1, unite: "forfait", pu: 80, tva: 20 },
    ],
    Chauffage: [
      { designation: "Chaudière gaz condensation A+++", qte: 1, unite: "u", pu: Math.round(1800 * scale), tva: 5.5 },
      { designation: "Pose et raccordement chaudière", qte: 1, unite: "forfait", pu: Math.round(600 * scale), tva: 10 },
      { designation: "Mise en service + essais", qte: 2, unite: "h", pu: 85, tva: 10 },
    ],
    Sanitaire: [
      { designation: "Équipements sanitaires (WC, lavabo, douche)", qte: 1, unite: "forfait", pu: Math.round(1200 * scale), tva: 20 },
      { designation: "Main-d'œuvre pose sanitaires", qte: Math.round(12 * scale), unite: "h", pu: 60, tva: 10 },
      { designation: "Carrelage et revêtement (pose)", qte: Math.round(6 * scale), unite: "m²", pu: 45, tva: 10 },
    ],
    Rénovation: [
      { designation: "Dépose et évacuation existant", qte: 1, unite: "forfait", pu: Math.round(400 * scale), tva: 10 },
      { designation: "Fournitures matériaux", qte: 1, unite: "forfait", pu: Math.round(1500 * scale), tva: 20 },
      { designation: "Main-d'œuvre rénovation", qte: Math.round(20 * scale), unite: "h", pu: 55, tva: 10 },
    ],
    Dépannage: [
      { designation: "Intervention urgence (forfait déplacement)", qte: 1, unite: "forfait", pu: 120, tva: 20 },
      { designation: "Main-d'œuvre dépannage", qte: 2, unite: "h", pu: 75, tva: 10 },
      { designation: "Pièces détachées", qte: 1, unite: "forfait", pu: Math.round(150 * scale), tva: 20 },
    ],
  };

  return templates[type] || templates["Plomberie"];
}
