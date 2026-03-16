"use client";

import { useState } from "react";
import { Save, Sparkles, Brain, MessageSquare, Sliders, RefreshCw, ChevronRight } from "lucide-react";
import { clsx } from "clsx";
import Toggle from "@/components/ui/Toggle";
import Badge from "@/components/ui/Badge";

const TONE_OPTIONS = [
  { id: "formal", label: "Formel", desc: "Langue professionnelle et soutenue" },
  { id: "neutral", label: "Neutre", desc: "Ton équilibré, adapté à tous" },
  { id: "friendly", label: "Convivial", desc: "Chaleureux et accessible" },
];

const EXAMPLE_PHRASES = [
  "Veuillez trouver ci-joint notre proposition tarifaire...",
  "Suite à notre échange téléphonique du [date]...",
  "Nous restons disponibles pour tout renseignement complémentaire.",
  "Dans l'attente de votre retour, nous vous adressons nos cordiales salutations.",
];

export default function AISection({ onSave }: { onSave: () => void }) {
  const [form, setForm] = useState({
    tone: "neutral",
    autoSuggest: true,
    learnFromHistory: true,
    includeGuarantee: true,
    includeMaterials: true,
    defaultPrompt: "Génère un devis détaillé pour des travaux de [type]. Le client est [particulier/professionnel]. Inclure la main-d'œuvre, les matériaux et les délais estimés.",
    customPhrases: EXAMPLE_PHRASES.join("\n"),
    aiEnabled: true,
  });
  const [saved, setSaved] = useState(false);
  const [regenerating, setRegenerating] = useState(false);

  const set = (k: string, v: string | boolean) => setForm((f) => ({ ...f, [k]: v }));

  const handleSave = () => {
    setSaved(true);
    setTimeout(() => { setSaved(false); onSave(); }, 1500);
  };

  const handleRegenerate = () => {
    setRegenerating(true);
    setTimeout(() => setRegenerating(false), 1500);
  };

  return (
    <div className="space-y-8">
      {/* Status */}
      <div className="p-4 rounded-xl bg-primary/5 border border-primary/15 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-xl bg-primary/10 flex items-center justify-center">
            <Sparkles className="w-4 h-4 text-primary" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <p className="text-sm font-semibold text-text-primary">Agent IA Facturia</p>
              <Badge variant="info" size="sm">Pro</Badge>
            </div>
            <p className="text-xs text-text-muted mt-0.5">Personnalisez le comportement de l&apos;IA pour vos documents</p>
          </div>
        </div>
        <Toggle checked={form.aiEnabled} onChange={(v) => set("aiEnabled", v)} />
      </div>

      {/* Tone */}
      <div>
        <div className="flex items-center gap-2 mb-4">
          <MessageSquare className="w-4 h-4 text-text-muted" />
          <h3 className="text-sm font-semibold text-text-primary">Ton de rédaction</h3>
          <div className="flex-1 h-px bg-surface-border ml-2" />
        </div>

        <div className="grid grid-cols-3 gap-3">
          {TONE_OPTIONS.map((opt) => (
            <button
              key={opt.id}
              onClick={() => set("tone", opt.id)}
              className={clsx(
                "p-3 rounded-xl border text-left transition-all",
                form.tone === opt.id
                  ? "border-primary/40 bg-primary/5"
                  : "border-surface-border bg-background hover:border-surface-active"
              )}
            >
              <p className={clsx("text-sm font-semibold", form.tone === opt.id ? "text-primary" : "text-text-primary")}>
                {opt.label}
              </p>
              <p className="text-[10px] text-text-muted mt-0.5">{opt.desc}</p>
            </button>
          ))}
        </div>
      </div>

      {/* Behavior */}
      <div>
        <div className="flex items-center gap-2 mb-4">
          <Brain className="w-4 h-4 text-text-muted" />
          <h3 className="text-sm font-semibold text-text-primary">Comportement</h3>
          <div className="flex-1 h-px bg-surface-border ml-2" />
        </div>

        <div className="space-y-3">
          {[
            { key: "autoSuggest", label: "Suggestions automatiques", desc: "Propose des améliorations lors de la saisie" },
            { key: "learnFromHistory", label: "Apprentissage depuis l'historique", desc: "L'IA adapte ses suggestions à vos devis passés" },
            { key: "includeGuarantee", label: "Inclure clause garantie décennale", desc: "Ajoute automatiquement la mention légale dans les devis" },
            { key: "includeMaterials", label: "Détailler les matériaux", desc: "Génère une liste détaillée des matériaux avec références" },
          ].map((opt) => (
            <div key={opt.key} className="flex items-center justify-between p-3 rounded-xl bg-background border border-surface-border">
              <div>
                <p className="text-sm font-medium text-text-primary">{opt.label}</p>
                <p className="text-xs text-text-muted">{opt.desc}</p>
              </div>
              <Toggle
                checked={form[opt.key as keyof typeof form] as boolean}
                onChange={(v) => set(opt.key, v)}
              />
            </div>
          ))}
        </div>
      </div>

      {/* Default prompt */}
      <div>
        <div className="flex items-center gap-2 mb-4">
          <Sliders className="w-4 h-4 text-text-muted" />
          <h3 className="text-sm font-semibold text-text-primary">Prompt de base</h3>
          <div className="flex-1 h-px bg-surface-border ml-2" />
        </div>

        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label className="field-label mb-0">Instructions par défaut</label>
            <button
              onClick={handleRegenerate}
              className="text-xs text-primary hover:text-primary-400 flex items-center gap-1 font-medium transition-colors"
            >
              <RefreshCw className={clsx("w-3 h-3", regenerating && "animate-spin")} /> Réinitialiser
            </button>
          </div>
          <textarea
            value={form.defaultPrompt}
            onChange={(e) => set("defaultPrompt", e.target.value)}
            rows={4}
            className="input-field w-full text-xs font-mono resize-none leading-relaxed"
          />
          <p className="text-[10px] text-text-muted mt-1.5">
            Variables disponibles : [type], [client_nom], [metier], [adresse_chantier], [date]
          </p>
        </div>
      </div>

      {/* Custom phrases */}
      <div>
        <div className="flex items-center gap-2 mb-4">
          <ChevronRight className="w-4 h-4 text-text-muted" />
          <h3 className="text-sm font-semibold text-text-primary">Formulations préférées</h3>
          <div className="flex-1 h-px bg-surface-border ml-2" />
        </div>

        <div>
          <p className="text-xs text-text-muted mb-2">
            L&apos;IA utilisera ces tournures en priorité lors de la génération. Une formulation par ligne.
          </p>
          <textarea
            value={form.customPhrases}
            onChange={(e) => set("customPhrases", e.target.value)}
            rows={6}
            className="input-field w-full text-xs font-mono resize-none leading-relaxed"
          />
        </div>
      </div>

      <div className="flex justify-end">
        <button
          onClick={handleSave}
          className={clsx(
            "flex items-center gap-2 px-5 py-2.5 rounded-xl font-semibold text-sm transition-all",
            saved ? "bg-primary/20 text-primary border border-primary/30" : "bg-primary text-background hover:bg-primary-400 hover:shadow-glow"
          )}
        >
          <Save className="w-4 h-4" />
          {saved ? "Enregistré ✓" : "Enregistrer"}
        </button>
      </div>
    </div>
  );
}
