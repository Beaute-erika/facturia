"use client";

import { useState, useEffect } from "react";
import { Camera, Save, Building2, Phone, Mail, Globe, MapPin, Hash, FileSignature, Loader2 } from "lucide-react";
import { clsx } from "clsx";
import { createBrowserClient } from "@/lib/supabase-client";

const METIERS = [
  "Plombier", "Électricien", "Maçon", "Carreleur", "Peintre",
  "Menuisier", "Charpentier", "Couvreur", "Chauffagiste", "Climaticien",
  "Jardinier / Paysagiste", "Serrurier", "Autre",
];

const FORMES_JURIDIQUES = ["Auto-entrepreneur", "EI", "EURL", "SARL", "SAS", "SASU", "SA"];

interface ProfileSectionProps {
  onSave: () => void;
}

export default function ProfileSection({ onSave }: ProfileSectionProps) {
  const [form, setForm] = useState({
    prenom: "",
    nom: "",
    metier: "Plombier",
    raisonSociale: "",
    formeJuridique: "Auto-entrepreneur",
    siret: "",
    tvaNum: "",
    adresse: "",
    codePostal: "",
    ville: "",
    tel: "",
    email: "",
    site: "",
    signature: "",
    mentionsLegales: "TVA non applicable, art. 293 B du CGI",
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");

  const set = (k: string, v: string) => setForm((f) => ({ ...f, [k]: v }));

  // Charger le profil depuis Supabase
  useEffect(() => {
    const supabase = createBrowserClient();
    supabase.auth.getUser().then(async ({ data: { user } }) => {
      if (!user) { setLoading(false); return; }
      const { data } = await supabase
        .from("users")
        .select("*")
        .eq("id", user.id)
        .single();
      if (data) {
        setForm({
          prenom: data.prenom ?? "",
          nom: data.nom ?? "",
          metier: data.metier ?? "Plombier",
          raisonSociale: data.raison_sociale ?? "",
          formeJuridique: data.forme_juridique ?? "Auto-entrepreneur",
          siret: data.siret ?? "",
          tvaNum: data.tva_num ?? "",
          adresse: data.adresse ?? "",
          codePostal: data.code_postal ?? "",
          ville: data.ville ?? "",
          tel: data.tel ?? "",
          email: data.email ?? user.email ?? "",
          site: data.site ?? "",
          signature: data.signature_email ?? `Cordialement,\n${data.prenom ?? ""} ${data.nom ?? ""}`,
          mentionsLegales: data.mentions_legales ?? "TVA non applicable, art. 293 B du CGI",
        });
      } else {
        // Profil pas encore créé — pré-remplir l'email
        setForm((f) => ({ ...f, email: user.email ?? "" }));
      }
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  const handleSave = async () => {
    setError("");
    setSaving(true);
    const supabase = createBrowserClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setError("Session expirée. Reconnectez-vous."); setSaving(false); return; }

    const { error: updateError } = await supabase
      .from("users")
      .update({
        prenom: form.prenom || undefined,
        nom: form.nom || undefined,
        metier: form.metier || undefined,
        raison_sociale: form.raisonSociale || null,
        forme_juridique: form.formeJuridique || undefined,
        siret: form.siret || null,
        tva_num: form.tvaNum || null,
        adresse: form.adresse || null,
        code_postal: form.codePostal || null,
        ville: form.ville || null,
        tel: form.tel || null,
        email: form.email || undefined,
        site: form.site || null,
        signature_email: form.signature || null,
        mentions_legales: form.mentionsLegales || null,
      })
      .eq("id", user.id);

    setSaving(false);
    if (updateError) {
      setError("Erreur lors de l'enregistrement. Réessayez.");
      return;
    }
    setSaved(true);
    setTimeout(() => { setSaved(false); onSave(); }, 1500);
  };

  const initials = `${form.prenom[0] ?? ""}${form.nom[0] ?? ""}`.toUpperCase() || "?";

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Avatar */}
      <div className="flex items-center gap-5">
        <div className="relative group cursor-pointer">
          <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-primary/30 to-primary/10 border-2 border-primary/20 flex items-center justify-center">
            <span className="text-2xl font-bold text-primary">{initials}</span>
          </div>
          <div className="absolute inset-0 rounded-2xl bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
            <Camera className="w-5 h-5 text-white" />
          </div>
        </div>
        <div>
          <p className="text-sm font-semibold text-text-primary">{form.prenom} {form.nom}</p>
          <p className="text-xs text-text-muted">{form.metier} · {form.formeJuridique}</p>
          <button className="mt-1.5 text-xs text-primary hover:text-primary-400 transition-colors font-medium">
            Changer le logo
          </button>
        </div>
      </div>

      {error && (
        <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
          {error}
        </div>
      )}

      {/* Identity */}
      <Section title="Identité">
        <div className="grid grid-cols-2 gap-4">
          <Field label="Prénom" value={form.prenom} onChange={(v) => set("prenom", v)} />
          <Field label="Nom" value={form.nom} onChange={(v) => set("nom", v)} />
          <div className="col-span-2">
            <Field label="Raison sociale / Nom commercial" value={form.raisonSociale} onChange={(v) => set("raisonSociale", v)} />
          </div>
          <div>
            <label className="field-label">Métier</label>
            <select value={form.metier} onChange={(e) => set("metier", e.target.value)} className="input-field w-full text-sm">
              {METIERS.map((m) => <option key={m}>{m}</option>)}
            </select>
          </div>
          <div>
            <label className="field-label">Forme juridique</label>
            <select value={form.formeJuridique} onChange={(e) => set("formeJuridique", e.target.value)} className="input-field w-full text-sm">
              {FORMES_JURIDIQUES.map((f) => <option key={f}>{f}</option>)}
            </select>
          </div>
        </div>
      </Section>

      {/* Legal */}
      <Section title="Informations légales" icon={Hash}>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <Field label="SIRET" value={form.siret} onChange={(v) => set("siret", v)} mono />
            <p className="text-[10px] text-text-muted mt-1">14 chiffres sans espaces ou formaté</p>
          </div>
          <div>
            <Field label="N° TVA intracommunautaire" value={form.tvaNum} onChange={(v) => set("tvaNum", v)} mono />
            <p className="text-[10px] text-text-muted mt-1">Laisser vide si non assujetti à la TVA</p>
          </div>
        </div>
        <div>
          <label className="field-label">Mentions légales sur factures</label>
          <input value={form.mentionsLegales} onChange={(e) => set("mentionsLegales", e.target.value)} className="input-field w-full text-sm" placeholder="Ex: TVA non applicable, art. 293 B du CGI" />
        </div>
      </Section>

      {/* Address */}
      <Section title="Adresse" icon={MapPin}>
        <Field label="Adresse" value={form.adresse} onChange={(v) => set("adresse", v)} />
        <div className="grid grid-cols-3 gap-4">
          <Field label="Code postal" value={form.codePostal} onChange={(v) => set("codePostal", v)} mono />
          <div className="col-span-2">
            <Field label="Ville" value={form.ville} onChange={(v) => set("ville", v)} />
          </div>
        </div>
      </Section>

      {/* Contact */}
      <Section title="Contact" icon={Phone}>
        <div className="grid grid-cols-2 gap-4">
          <Field label="Téléphone" value={form.tel} onChange={(v) => set("tel", v)} icon={Phone} />
          <Field label="Email professionnel" value={form.email} onChange={(v) => set("email", v)} icon={Mail} type="email" />
          <div className="col-span-2">
            <Field label="Site web" value={form.site} onChange={(v) => set("site", v)} icon={Globe} />
          </div>
        </div>
      </Section>

      {/* Email signature */}
      <Section title="Signature email" icon={FileSignature}>
        <p className="text-xs text-text-muted mb-2">Ajoutée automatiquement lors des envois de devis et factures.</p>
        <textarea
          value={form.signature}
          onChange={(e) => set("signature", e.target.value)}
          rows={5}
          className="input-field w-full text-sm font-mono resize-none leading-relaxed"
        />
      </Section>

      {/* Save */}
      <div className="flex justify-end">
        <button
          onClick={handleSave}
          disabled={saving}
          className={clsx(
            "flex items-center gap-2 px-5 py-2.5 rounded-xl font-semibold text-sm transition-all",
            saved
              ? "bg-primary/20 text-primary border border-primary/30"
              : "bg-primary text-background hover:bg-primary-400 hover:shadow-glow disabled:opacity-60"
          )}
        >
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
          {saved ? "Enregistré ✓" : saving ? "Enregistrement…" : "Enregistrer"}
        </button>
      </div>
    </div>
  );
}

function Section({ title, icon: Icon = Building2, children }: { title: string; icon?: React.ElementType; children: React.ReactNode }) {
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

function Field({ label, value, onChange, mono, icon: Icon, type = "text" }: {
  label: string; value: string; onChange: (v: string) => void;
  mono?: boolean; icon?: React.ElementType; type?: string;
}) {
  return (
    <div>
      <label className="field-label">{label}</label>
      <div className="relative">
        {Icon && <Icon className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-text-muted pointer-events-none" />}
        <input
          type={type}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className={clsx("input-field w-full text-sm", Icon && "pl-9", mono && "font-mono")}
        />
      </div>
    </div>
  );
}
