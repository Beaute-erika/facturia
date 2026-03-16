"use client";

import { useState } from "react";
import { Save, Hash, Euro, Calendar, FileText, CreditCard, Eye } from "lucide-react";
import { clsx } from "clsx";
import Toggle from "@/components/ui/Toggle";

const TVA_RATES = ["0%", "5,5%", "10%", "20%"];
const PAYMENT_TERMS = ["15 jours", "30 jours", "45 jours", "60 jours", "À réception"];

export default function FacturationSection({ onSave }: { onSave: () => void }) {
  const [form, setForm] = useState({
    devisPrefix: "DV",
    devisNext: "157",
    facturePrefix: "FA",
    factureNext: "090",
    tvaDefault: "10%",
    paymentTerm: "30 jours",
    iban: "FR76 3000 6000 0112 3456 7890 189",
    bic: "BNPAFRPPXXX",
    penaliteRetard: "En cas de retard de paiement, une indemnité forfaitaire de 40 € sera appliquée, ainsi que des pénalités au taux de 3 fois le taux d'intérêt légal.",
    footerFacture: "Merci pour votre confiance. Plomberie Dupont — SIRET 123 456 789 00012",
    cgu: "Travaux réalisés selon les règles de l'art. Garantie décennale souscrite auprès d'AXA, contrat n°123456. Garantie de parfait achèvement 1 an.",
    logoOnFacture: true,
    signatureOnFacture: true,
    watermarkDraft: true,
    autoNumbering: true,
  });
  const [saved, setSaved] = useState(false);

  const set = (k: string, v: string | boolean) => setForm((f) => ({ ...f, [k]: v }));

  const handleSave = () => {
    setSaved(true);
    setTimeout(() => { setSaved(false); onSave(); }, 1500);
  };

  return (
    <div className="space-y-8">
      {/* Numérotation */}
      <Section title="Numérotation automatique" icon={Hash}>
        <div className="grid grid-cols-2 gap-4">
          <div className="p-4 rounded-xl bg-background border border-surface-border">
            <p className="text-xs font-semibold text-text-muted uppercase tracking-wider mb-3">Devis</p>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="field-label">Préfixe</label>
                <input value={form.devisPrefix} onChange={(e) => set("devisPrefix", e.target.value)} className="input-field w-full text-sm font-mono" />
              </div>
              <div>
                <label className="field-label">Prochain n°</label>
                <input value={form.devisNext} onChange={(e) => set("devisNext", e.target.value)} className="input-field w-full text-sm font-mono" />
              </div>
            </div>
            <p className="text-[10px] text-text-muted mt-2">
              Prochain devis : <span className="font-mono text-primary">{form.devisPrefix}-2026-{form.devisNext.padStart(3, "0")}</span>
            </p>
          </div>
          <div className="p-4 rounded-xl bg-background border border-surface-border">
            <p className="text-xs font-semibold text-text-muted uppercase tracking-wider mb-3">Factures</p>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="field-label">Préfixe</label>
                <input value={form.facturePrefix} onChange={(e) => set("facturePrefix", e.target.value)} className="input-field w-full text-sm font-mono" />
              </div>
              <div>
                <label className="field-label">Prochain n°</label>
                <input value={form.factureNext} onChange={(e) => set("factureNext", e.target.value)} className="input-field w-full text-sm font-mono" />
              </div>
            </div>
            <p className="text-[10px] text-text-muted mt-2">
              Prochaine facture : <span className="font-mono text-primary">{form.facturePrefix}-2026-{form.factureNext.padStart(3, "0")}</span>
            </p>
          </div>
        </div>
        <div className="flex items-center justify-between p-3 rounded-xl bg-background border border-surface-border">
          <div>
            <p className="text-sm font-medium text-text-primary">Numérotation continue</p>
            <p className="text-xs text-text-muted">Interdit de sauter ou modifier un numéro déjà émis (obligation légale)</p>
          </div>
          <Toggle checked={form.autoNumbering} onChange={(v) => set("autoNumbering", v)} />
        </div>
      </Section>

      {/* TVA & délais */}
      <Section title="TVA & délais de paiement" icon={Euro}>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="field-label">Taux TVA par défaut</label>
            <div className="flex gap-2 flex-wrap">
              {TVA_RATES.map((r) => (
                <button
                  key={r}
                  onClick={() => set("tvaDefault", r)}
                  className={clsx(
                    "px-3 py-1.5 rounded-lg text-sm font-medium border transition-all",
                    form.tvaDefault === r
                      ? "bg-primary/10 border-primary/30 text-primary"
                      : "border-surface-border text-text-muted hover:text-text-primary hover:border-surface-active"
                  )}
                >
                  {r}
                </button>
              ))}
            </div>
            <p className="text-[10px] text-text-muted mt-1.5">TVA travaux rénovation logement : 10% · Neuf / Pro : 20%</p>
          </div>
          <div>
            <label className="field-label">Délai de paiement par défaut</label>
            <select value={form.paymentTerm} onChange={(e) => set("paymentTerm", e.target.value)} className="input-field w-full text-sm">
              {PAYMENT_TERMS.map((t) => <option key={t}>{t}</option>)}
            </select>
            <p className="text-[10px] text-text-muted mt-1.5">Appliqué automatiquement à chaque nouvelle facture</p>
          </div>
        </div>
        <div>
          <label className="field-label flex items-center gap-1.5"><Calendar className="w-3 h-3" /> Mention pénalités de retard</label>
          <textarea
            value={form.penaliteRetard}
            onChange={(e) => set("penaliteRetard", e.target.value)}
            rows={3}
            className="input-field w-full text-xs resize-none leading-relaxed"
          />
        </div>
      </Section>

      {/* Coordonnées bancaires */}
      <Section title="Coordonnées bancaires" icon={CreditCard}>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="field-label">IBAN</label>
            <input value={form.iban} onChange={(e) => set("iban", e.target.value)} className="input-field w-full text-sm font-mono" />
          </div>
          <div>
            <label className="field-label">BIC / SWIFT</label>
            <input value={form.bic} onChange={(e) => set("bic", e.target.value)} className="input-field w-full text-sm font-mono" />
          </div>
        </div>
        <div className="p-3 rounded-xl bg-primary/5 border border-primary/15 text-xs text-text-muted">
          Ces coordonnées apparaissent sur toutes vos factures dans la section «&nbsp;Modalités de paiement&nbsp;».
        </div>
      </Section>

      {/* Apparence documents */}
      <Section title="Apparence des documents" icon={FileText}>
        <div className="space-y-3">
          {[
            { key: "logoOnFacture", label: "Afficher le logo", desc: "Logo en haut à gauche de chaque document" },
            { key: "signatureOnFacture", label: "Afficher la signature", desc: "Vos coordonnées en bas de page" },
            { key: "watermarkDraft", label: "Filigrane sur les brouillons", desc: "Mention \"BROUILLON\" en transparence" },
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
        <div>
          <label className="field-label">Pied de page facture</label>
          <input value={form.footerFacture} onChange={(e) => set("footerFacture", e.target.value)} className="input-field w-full text-sm" />
        </div>
        <div>
          <label className="field-label">Conditions générales (CGU/CGV)</label>
          <textarea value={form.cgu} onChange={(e) => set("cgu", e.target.value)} rows={3} className="input-field w-full text-xs resize-none leading-relaxed" />
        </div>
        <button
          className="flex items-center gap-2 text-xs text-primary font-semibold hover:text-primary-400 transition-colors"
        >
          <Eye className="w-3.5 h-3.5" /> Prévisualiser une facture
        </button>
      </Section>

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

function Section({ title, icon: Icon, children }: { title: string; icon: React.ElementType; children: React.ReactNode }) {
  return (
    <div>
      <div className="flex items-center gap-2 mb-4">
        <Icon className="w-4 h-4 text-text-muted" />
        <h3 className="text-sm font-semibold text-text-primary">{title}</h3>
        <div className="flex-1 h-px bg-surface-border ml-2" />
      </div>
      <div className="space-y-3">{children}</div>
    </div>
  );
}
