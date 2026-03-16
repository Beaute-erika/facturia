"use client";

import { useState } from "react";
import { Save, Link2, CheckCircle2, AlertCircle, ExternalLink, Building, Hash, RefreshCw } from "lucide-react";
import { clsx } from "clsx";
import Toggle from "@/components/ui/Toggle";

export default function ChorusSection({ onSave }: { onSave: () => void }) {
  const [connected, setConnected] = useState(false);
  const [form, setForm] = useState({
    siret: "123 456 789 00012",
    serviceCode: "",
    engagementNum: "",
    autoSend: false,
    testMode: true,
  });
  const [connecting, setConnecting] = useState(false);
  const [saved, setSaved] = useState(false);

  const set = (k: string, v: string | boolean) => setForm((f) => ({ ...f, [k]: v }));

  const handleConnect = () => {
    setConnecting(true);
    setTimeout(() => { setConnecting(false); setConnected(true); }, 2000);
  };

  const handleSave = () => {
    setSaved(true);
    setTimeout(() => { setSaved(false); onSave(); }, 1500);
  };

  return (
    <div className="space-y-8">
      {/* Status banner */}
      <div className={clsx(
        "p-4 rounded-xl border flex items-start gap-3",
        connected
          ? "bg-success/5 border-success/20"
          : "bg-warning/5 border-warning/20"
      )}>
        {connected
          ? <CheckCircle2 className="w-4 h-4 text-success flex-shrink-0 mt-0.5" />
          : <AlertCircle className="w-4 h-4 text-warning flex-shrink-0 mt-0.5" />
        }
        <div>
          <p className={clsx("text-sm font-semibold", connected ? "text-success" : "text-warning")}>
            {connected ? "Connecté à Chorus Pro" : "Non connecté à Chorus Pro"}
          </p>
          <p className="text-xs text-text-muted mt-0.5">
            {connected
              ? "Vos factures éligibles peuvent être transmises automatiquement."
              : "Connectez votre compte pour envoyer des factures aux entités publiques."}
          </p>
        </div>
      </div>

      {/* What is Chorus Pro */}
      <div>
        <div className="flex items-center gap-2 mb-4">
          <Building className="w-4 h-4 text-text-muted" />
          <h3 className="text-sm font-semibold text-text-primary">Qu&apos;est-ce que Chorus Pro ?</h3>
          <div className="flex-1 h-px bg-surface-border ml-2" />
        </div>
        <div className="p-4 rounded-xl bg-background border border-surface-border space-y-2">
          <p className="text-sm text-text-secondary leading-relaxed">
            Chorus Pro est la plateforme officielle de l&apos;État français pour la facturation électronique des marchés publics.
            Depuis 2020, toutes les entreprises (quelle que soit leur taille) sont obligées de transmettre leurs factures
            aux entités publiques via cette plateforme.
          </p>
          <a
            href="#"
            className="inline-flex items-center gap-1.5 text-xs text-primary hover:text-primary-400 font-medium transition-colors"
          >
            <ExternalLink className="w-3 h-3" /> En savoir plus sur chorus-pro.gouv.fr
          </a>
        </div>
      </div>

      {/* Connection */}
      <div>
        <div className="flex items-center gap-2 mb-4">
          <Link2 className="w-4 h-4 text-text-muted" />
          <h3 className="text-sm font-semibold text-text-primary">Connexion</h3>
          <div className="flex-1 h-px bg-surface-border ml-2" />
        </div>

        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="field-label">SIRET</label>
              <input
                value={form.siret}
                onChange={(e) => set("siret", e.target.value)}
                className="input-field w-full text-sm font-mono"
                placeholder="14 chiffres"
              />
            </div>
            <div>
              <label className="field-label">Code service (optionnel)</label>
              <input
                value={form.serviceCode}
                onChange={(e) => set("serviceCode", e.target.value)}
                className="input-field w-full text-sm font-mono"
                placeholder="Ex: SERV001"
              />
              <p className="text-[10px] text-text-muted mt-1">Fourni par l&apos;entité publique commanditaire</p>
            </div>
          </div>

          {!connected ? (
            <button
              onClick={handleConnect}
              disabled={connecting}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-primary text-background font-semibold text-sm hover:bg-primary-400 hover:shadow-glow transition-all disabled:opacity-50"
            >
              {connecting ? (
                <><RefreshCw className="w-4 h-4 animate-spin" /> Connexion en cours...</>
              ) : (
                <><Link2 className="w-4 h-4" /> Se connecter à Chorus Pro</>
              )}
            </button>
          ) : (
            <button
              onClick={() => setConnected(false)}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-error/10 text-error font-semibold text-sm hover:bg-error/20 transition-all border border-error/20"
            >
              Déconnecter
            </button>
          )}
        </div>
      </div>

      {/* Settings */}
      <div>
        <div className="flex items-center gap-2 mb-4">
          <Hash className="w-4 h-4 text-text-muted" />
          <h3 className="text-sm font-semibold text-text-primary">Paramètres de transmission</h3>
          <div className="flex-1 h-px bg-surface-border ml-2" />
        </div>

        <div className="space-y-3">
          <div>
            <label className="field-label">N° d&apos;engagement par défaut</label>
            <input
              value={form.engagementNum}
              onChange={(e) => set("engagementNum", e.target.value)}
              className="input-field w-full text-sm font-mono"
              placeholder="Laisser vide si variable selon la commande"
            />
            <p className="text-[10px] text-text-muted mt-1">Peut être surchargé sur chaque facture individuelle</p>
          </div>

          {[
            { key: "autoSend", label: "Envoi automatique", desc: "Transmet automatiquement les factures marquées 'public' dès validation" },
            { key: "testMode", label: "Mode test", desc: "Envoie en environnement de qualification (non comptabilisé)" },
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
