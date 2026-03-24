"use client";

import { useRef, useState } from "react";
import { ImageIcon, Upload, X, Loader2 } from "lucide-react";
import { createBrowserClient } from "@/lib/supabase-client";

const ACCEPTED_TYPES = ["image/png", "image/jpeg", "image/webp", "image/svg+xml"];
const MAX_SIZE_MB = 5;

interface LogoUploadProps {
  defaultUrl?: string | null;
  onSuccess: (url: string) => void;
  onRemove: () => void;
}

export function LogoUpload({ defaultUrl, onSuccess, onRemove }: LogoUploadProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [logoUploading, setLogoUploading] = useState(false);
  const [logoError, setLogoError] = useState("");
  const [logoSuccess, setLogoSuccess] = useState(false);

  const currentLogo = logoPreview ?? defaultUrl;

  const handleLogoChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!e.target.value) return;
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

    const objectUrl = URL.createObjectURL(file);
    setLogoPreview(objectUrl);

    setLogoUploading(true);
    try {
      const supabase = createBrowserClient();
      const { data: { user }, error: authErr } = await supabase.auth.getUser();
      if (authErr || !user) {
        setLogoError("Session expirée. Reconnectez-vous.");
        setLogoUploading(false);
        return;
      }

      const ext = file.name.split(".").pop()?.toLowerCase() ?? "png";
      const path = `${user.id}/logo.${ext}`;

      const { error: uploadErr } = await supabase.storage
        .from("logos")
        .upload(path, file, { upsert: true, contentType: file.type });

      if (uploadErr) {
        console.error("[LogoUpload] storage error:", uploadErr);
        if (uploadErr.message.includes("Bucket not found") || uploadErr.message.includes("bucket")) {
          setLogoError("Le bucket 'logos' n'existe pas encore dans Supabase Storage. Voir les instructions ci-dessous.");
        } else {
          setLogoError(`Erreur upload : ${uploadErr.message}`);
        }
        setLogoPreview(null);
        setLogoUploading(false);
        return;
      }

      const { data: urlData } = supabase.storage.from("logos").getPublicUrl(path);
      const publicUrl = `${urlData.publicUrl}?t=${Date.now()}`;

      const { error: dbErr } = await supabase
        .from("users")
        .update({ logo_url: publicUrl })
        .eq("id", user.id);

      if (dbErr) {
        console.error("[LogoUpload] logo_url update error:", dbErr);
        setLogoError(`Logo uploadé mais erreur de sauvegarde : ${dbErr.message}`);
        setLogoUploading(false);
        return;
      }

      onSuccess(publicUrl);
      setLogoSuccess(true);
      setTimeout(() => setLogoSuccess(false), 3000);
    } catch (err) {
      console.error("[LogoUpload] unexpected error:", err);
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
    setLogoPreview(null);
    onRemove();
  };

  return (
    <div>
      <div className="flex items-center gap-2 mb-4">
        <ImageIcon className="w-4 h-4 text-text-muted" />
        <h3 className="text-sm font-semibold text-text-primary">Logo de l&apos;entreprise</h3>
        <div className="flex-1 h-px bg-surface-border ml-2" />
      </div>
      <div className="space-y-3">
        <div className="flex items-start gap-6">
          {/* Aperçu */}
          <div className="relative flex-shrink-0">
            <div className="w-24 h-24 rounded-2xl border-2 border-dashed border-surface-border bg-surface flex items-center justify-center overflow-hidden">
              {currentLogo ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={currentLogo} alt="Logo entreprise" className="w-full h-full object-contain p-1" />
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
      </div>
    </div>
  );
}
