"use client";

import { useState, useEffect, useRef } from "react";
import { Save, Building2, Phone, Mail, Globe, MapPin, Hash, FileSignature, Loader2, Upload, X, ImageIcon } from "lucide-react";
import { clsx } from "clsx";
import { createBrowserClient } from "@/lib/supabase-client";

const METIERS = [
  "Plombier", "Électricien", "Maçon", "Carreleur", "Peintre",
  "Menuisier", "Charpentier", "Couvreur", "Chauffagiste", "Climaticien",
  "Jardinier / Paysagiste", "Serrurier", "Autre",
];

const FORMES_JURIDIQUES = ["Auto-entrepreneur", "EI", "EURL", "SARL", "SAS", "SASU", "SA"];
const ACCEPTED_TYPES = ["image/png", "image/jpeg", "image/webp", "image/svg+xml"];
const MAX_SIZE_MB = 2;

interface ProfileSectionProps {
  onSave: () => void;
}

export default function ProfileSection({ onSave }: ProfileSectionProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);

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
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");

  const [logoUploading, setLogoUploading] = useState(false);
  const [logoError, setLogoError] = useState("");
  const [logoSuccess, setLogoSuccess] = useState(false);

  const set = (k: string, v: string) => setForm((f) => ({ ...f, [k]: v }));

  // ── Charger le profil ──────────────────────────────────────────────────────
  useEffect(() => {
    const supabase = createBrowserClient();
    supabase.auth.getUser().then(async ({ data: { user }, error: authErr }) => {
      if (authErr || !user) { setLoading(false); return; }

      const { data, error: fetchErr } = await supabase
        .from("users")
        .select("*")
        .eq("id", user.id)
        .single();

      if (fetchErr && fetchErr.code !== "PGRST116") {
        console.error("[ProfileSection] fetch error:", fetchErr);
      }

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
        if (data.logo_url) setLogoUrl(data.logo_url);
      } else {
        setForm((f) => ({ ...f, email: user.email ?? "" }));
      }
      setLoading(false);
    }).catch((err) => {
      console.error("[ProfileSection] load error:", err);
      setLoading(false);
    });
  }, []);

  // ── Upload logo ────────────────────────────────────────────────────────────
  const handleLogoChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!e.target.value) return;
    // reset input value so same file can be re-selected
    e.target.value = "";

    setLogoError("");
    setLogoSuccess(false);

    if (!file) return;

    if (!ACCEPTED_TYPES.includes(file.type)) {
      setLogoError("Format non supporté. Utilisez PNG, JPG, WEBP ou SVG.");
      return;
    }
    if (file.size > MAX_SIZE_MB * 1024 * 1024) {
      setLogoError(`Fichier trop lourd. Maximum ${MAX_SIZE_MB} Mo.`);
      return;
    }

    // Aperçu immédiat
    const objectUrl = URL.createObjectURL(file);
    setLogoPreview(objectUrl);

    setLogoUploading(true);
    try {
      const supabase = createBrowserClient();
      const { data: { user }, error: authErr } = await supabase.auth.getUser();
      if (authErr || !user) { setLogoError("Session expirée. Reconnectez-vous."); setLogoUploading(false); return; }

      const ext = file.name.split(".").pop()?.toLowerCase() ?? "png";
      const path = `${user.id}/logo.${ext}`;

      // Upload (upsert = remplace si existe déjà)
      const { error: uploadErr } = await supabase.storage
        .from("logos")
        .upload(path, file, { upsert: true, contentType: file.type });

      if (uploadErr) {
        console.error("[ProfileSection] storage upload error:", uploadErr);
        if (uploadErr.message.includes("Bucket not found") || uploadErr.message.includes("bucket")) {
          setLogoError("Le bucket 'logos' n'existe pas encore dans Supabase Storage. Voir les instructions ci-dessous.");
        } else {
          setLogoError(`Erreur upload : ${uploadErr.message}`);
        }
        setLogoPreview(null);
        setLogoUploading(false);
        return;
      }

      // URL publique
      const { data: urlData } = supabase.storage.from("logos").getPublicUrl(path);
      const publicUrl = `${urlData.publicUrl}?t=${Date.now()}`; // cache-bust

      // Sauvegarder en DB
      const { error: dbErr } = await supabase
        .from("users")
        .update({ logo_url: publicUrl })
        .eq("id", user.id);

      if (dbErr) {
        console.error("[ProfileSection] logo_url update error:", dbErr);
        setLogoError(`Logo uploadé mais erreur de sauvegarde : ${dbErr.message}`);
        setLogoUploading(false);
        return;
      }

      setLogoUrl(publicUrl);
      setLogoSuccess(true);
      setTimeout(() => setLogoSuccess(false), 3000);
    } catch (err) {
      console.error("[ProfileSection] logo upload unexpected error:", err);
      setLogoError("Erreur inattendue lors de l'upload.");
      setLogoPreview(null);
    } finally {
      setLogoUploading(false);
    }
  };

  const handleRemoveLogo = async () => {
    setLogoError("");
    const supabase = createBrowserClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    await supabase.from("users").update({ logo_url: null }).eq("id", user.id);
    setLogoUrl(null);
    setLogoPreview(null);
  };

  // ── Sauvegarder le profil ──────────────────────────────────────────────────
  const handleSave = async () => {
    setError("");
    setSaving(true);
    try {
      const supabase = createBrowserClient();
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      if (authError || !user) {
        setError("Session expirée. Reconnectez-vous.");
        setSaving(false);
        return;
      }

      const { error: updateError, count } = await supabase
        .from("users")
        .update({
          prenom: form.prenom || "",
          nom: form.nom || "",
          metier: form.metier || "Artisan",
          raison_sociale: form.raisonSociale || null,
          forme_juridique: form.formeJuridique || "Auto-entrepreneur",
          siret: form.siret || null,
          tva_num: form.tvaNum || null,
          adresse: form.adresse || null,
          code_postal: form.codePostal || null,
          ville: form.ville || null,
          tel: form.tel || null,
          site: form.site || null,
          signature_email: form.signature || null,
          mentions_legales: form.mentionsLegales || null,
        }, { count: "exact" })
        .eq("id", user.id);

      setSaving(false);

      if (updateError) {
        console.error("[ProfileSection] update error:", updateError);
        setError(`Erreur : ${updateError.message}`);
        return;
      }

      if (count === 0) {
        const { error: insertError } = await supabase
          .from("users")
          .insert({
            id: user.id,
            email: user.email ?? "",
            prenom: form.prenom || "",
            nom: form.nom || "",
            metier: form.metier || "Artisan",
            raison_sociale: form.raisonSociale || null,
            forme_juridique: form.formeJuridique || "Auto-entrepreneur",
            siret: form.siret || null,
            tva_num: form.tvaNum || null,
            adresse: form.adresse || null,
            code_postal: form.codePostal || null,
            ville: form.ville || null,
            tel: form.tel || null,
            site: form.site || null,
            signature_email: form.signature || null,
            mentions_legales: form.mentionsLegales || null,
          });
        if (insertError) {
          console.error("[ProfileSection] insert error:", insertError);
          setError(`Erreur création profil : ${insertError.message}`);
          return;
        }
      }

      setSaved(true);
      setTimeout(() => { setSaved(false); onSave(); }, 1500);
    } catch (err) {
      console.error("[ProfileSection] unexpected error:", err);
      setError("Erreur inattendue. Réessayez.");
      setSaving(false);
    }
  };

  const currentLogo = logoPreview ?? logoUrl;

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-8">

      {/* ── Logo entreprise ── */}
      <Section title="Logo de l'entreprise" icon={ImageIcon}>
        <div className="flex items-start gap-6">
          {/* Aperçu */}
          <div className="relative flex-shrink-0">
            <div className="w-24 h-24 rounded-2xl border-2 border-dashed border-surface-border bg-surface flex items-center justify-center overflow-hidden">
              {currentLogo ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={currentLogo}
                  alt="Logo entreprise"
                  className="w-full h-full object-contain p-1"
                />
              ) : (
                <div className="flex flex-col items-center gap-1 text-text-muted">
                  <ImageIcon className="w-8 h-8 opacity-40" />
                  <span className="text-[10px]">Aucun logo</span>
                </div>
              )}
            </div>
            {currentLogo && (
              <button
                onClick={handleRemoveLogo}
                title="Supprimer le logo"
                className="absolute -top-2 -right-2 w-5 h-5 rounded-full bg-status-error text-white flex items-center justify-center hover:opacity-80 transition-opacity"
              >
                <X className="w-3 h-3" />
              </button>
            )}
          </div>

          {/* Contrôles */}
          <div className="flex-1 space-y-3">
            <div>
              <p className="text-sm font-medium text-text-primary mb-1">
                {currentLogo ? "Remplacer le logo" : "Ajouter un logo"}
              </p>
              <p className="text-xs text-text-muted">PNG, JPG, WEBP ou SVG — max {MAX_SIZE_MB} Mo</p>
            </div>

            {/* Input file caché + bouton visible */}
            <input
              ref={fileInputRef}
              type="file"
              accept=".png,.jpg,.jpeg,.webp,.svg,image/png,image/jpeg,image/webp,image/svg+xml"
              className="hidden"
              onChange={handleLogoChange}
            />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={logoUploading}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl border border-surface-border bg-surface text-sm font-semibold text-text-primary hover:bg-surface-active hover:border-surface-active transition-all disabled:opacity-60"
            >
              {logoUploading
                ? <><Loader2 className="w-4 h-4 animate-spin" /> Envoi en cours…</>
                : <><Upload className="w-4 h-4" /> {currentLogo ? "Changer le logo" : "Choisir un fichier"}</>
              }
            </button>

            {/* Messages */}
            {logoError && (
              <div className="p-2.5 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-xs leading-relaxed">
                {logoError}
                {logoError.includes("bucket") && (
                  <div className="mt-2 font-mono text-[10px] bg-black/20 rounded p-2 whitespace-pre-wrap">
                    {`-- À exécuter dans Supabase > SQL Editor :\ninsert into storage.buckets (id, name, public)\nvalues ('logos', 'logos', true);\n\ncreate policy "Logo insert" on storage.objects\n  for insert to authenticated\n  with check (bucket_id = 'logos'\n    AND auth.uid()::text = (storage.foldername(name))[1]);\n\ncreate policy "Logo update" on storage.objects\n  for update to authenticated\n  using (bucket_id = 'logos'\n    AND auth.uid()::text = (storage.foldername(name))[1]);\n\ncreate policy "Logo read" on storage.objects\n  for select to public\n  using (bucket_id = 'logos');\n\ncreate policy "Logo delete" on storage.objects\n  for delete to authenticated\n  using (bucket_id = 'logos'\n    AND auth.uid()::text = (storage.foldername(name))[1]);`}
                  </div>
                )}
              </div>
            )}
            {logoSuccess && (
              <p className="text-xs text-status-success font-medium">Logo enregistré ✓</p>
            )}
          </div>
        </div>

        <p className="text-xs text-text-muted">
          Le logo apparaîtra en haut à gauche de vos devis et factures PDF.
        </p>
      </Section>

      {/* ── Identité ── */}
      {error && (
        <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
          {error}
        </div>
      )}

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

      <Section title="Adresse" icon={MapPin}>
        <Field label="Adresse" value={form.adresse} onChange={(v) => set("adresse", v)} />
        <div className="grid grid-cols-3 gap-4">
          <Field label="Code postal" value={form.codePostal} onChange={(v) => set("codePostal", v)} mono />
          <div className="col-span-2">
            <Field label="Ville" value={form.ville} onChange={(v) => set("ville", v)} />
          </div>
        </div>
      </Section>

      <Section title="Contact" icon={Phone}>
        <div className="grid grid-cols-2 gap-4">
          <Field label="Téléphone" value={form.tel} onChange={(v) => set("tel", v)} icon={Phone} />
          <Field label="Email professionnel" value={form.email} onChange={(v) => set("email", v)} icon={Mail} type="email" />
          <div className="col-span-2">
            <Field label="Site web" value={form.site} onChange={(v) => set("site", v)} icon={Globe} />
          </div>
        </div>
      </Section>

      <Section title="Signature email" icon={FileSignature}>
        <p className="text-xs text-text-muted mb-2">Ajoutée automatiquement lors des envois de devis et factures.</p>
        <textarea
          value={form.signature}
          onChange={(e) => set("signature", e.target.value)}
          rows={5}
          className="input-field w-full text-sm font-mono resize-none leading-relaxed"
        />
      </Section>

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

// ── Helpers ────────────────────────────────────────────────────────────────────

function Section({ title, icon: Icon = Building2, children }: {
  title: string; icon?: React.ElementType; children: React.ReactNode;
}) {
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
