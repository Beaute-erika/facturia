"use client";

import { useState } from "react";
import { Save, Key, Shield, Smartphone, LogOut, Eye, EyeOff, Monitor, Loader2 } from "lucide-react";
import { clsx } from "clsx";
import Toggle from "@/components/ui/Toggle";
import Badge from "@/components/ui/Badge";
import { createBrowserClient } from "@/lib/supabase-client";

export default function SecuritySection({ onSave }: { onSave: () => void }) {
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [twoFA, setTwoFA] = useState(false);
  const [twoFAStep, setTwoFAStep] = useState<"idle" | "setup" | "done">("idle");
  const [passwords, setPasswords] = useState({ current: "", newPwd: "", confirm: "" });
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [pwdError, setPwdError] = useState("");

  const setP = (k: string, v: string) => setPasswords((p) => ({ ...p, [k]: v }));

  const handleSave = async () => {
    setPwdError("");
    if (!passwords.newPwd && !passwords.current) return;

    if (!passwords.current) { setPwdError("Entrez votre mot de passe actuel."); return; }
    if (passwords.newPwd.length < 8) { setPwdError("Le nouveau mot de passe doit contenir au moins 8 caractères."); return; }
    if (passwords.newPwd !== passwords.confirm) { setPwdError("Les mots de passe ne correspondent pas."); return; }

    setSaving(true);
    const supabase = createBrowserClient();

    // Vérifier le mot de passe actuel en tentant une re-authentification
    const { data: { user } } = await supabase.auth.getUser();
    if (!user?.email) { setPwdError("Session expirée. Reconnectez-vous."); setSaving(false); return; }

    const { error: signInError } = await supabase.auth.signInWithPassword({
      email: user.email,
      password: passwords.current,
    });
    if (signInError) { setPwdError("Mot de passe actuel incorrect."); setSaving(false); return; }

    const { error: updateError } = await supabase.auth.updateUser({ password: passwords.newPwd });
    setSaving(false);
    if (updateError) { setPwdError(updateError.message); return; }

    setPasswords({ current: "", newPwd: "", confirm: "" });
    setSaved(true);
    setTimeout(() => { setSaved(false); onSave(); }, 1500);
  };

  return (
    <div className="space-y-8">
      {/* Password */}
      <div>
        <div className="flex items-center gap-2 mb-4">
          <Key className="w-4 h-4 text-text-muted" />
          <h3 className="text-sm font-semibold text-text-primary">Mot de passe</h3>
          <div className="flex-1 h-px bg-surface-border ml-2" />
        </div>

        {pwdError && (
          <div className="mb-3 p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
            {pwdError}
          </div>
        )}

        <div className="space-y-3">
          {[
            { key: "current", label: "Mot de passe actuel", show: showCurrent, toggle: () => setShowCurrent((v) => !v) },
            { key: "newPwd", label: "Nouveau mot de passe", show: showNew, toggle: () => setShowNew((v) => !v) },
            { key: "confirm", label: "Confirmer le nouveau", show: showConfirm, toggle: () => setShowConfirm((v) => !v) },
          ].map((f) => (
            <div key={f.key}>
              <label className="field-label">{f.label}</label>
              <div className="relative">
                <input
                  type={f.show ? "text" : "password"}
                  value={passwords[f.key as keyof typeof passwords]}
                  onChange={(e) => setP(f.key, e.target.value)}
                  className="input-field w-full text-sm pr-10"
                  placeholder="••••••••"
                />
                <button
                  type="button"
                  onClick={f.toggle}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted hover:text-text-primary transition-colors"
                >
                  {f.show ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>
          ))}

          {passwords.newPwd && (
            <div className="flex items-center gap-2">
              <div className="flex gap-1 flex-1">
                {[1, 2, 3, 4].map((i) => (
                  <div
                    key={i}
                    className={clsx(
                      "h-1 flex-1 rounded-full transition-colors",
                      passwords.newPwd.length >= i * 3
                        ? passwords.newPwd.length >= 12 ? "bg-success" : passwords.newPwd.length >= 8 ? "bg-warning" : "bg-error"
                        : "bg-surface-active"
                    )}
                  />
                ))}
              </div>
              <span className="text-[10px] text-text-muted">
                {passwords.newPwd.length >= 12 ? "Fort" : passwords.newPwd.length >= 8 ? "Moyen" : "Faible"}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* 2FA */}
      <div>
        <div className="flex items-center gap-2 mb-4">
          <Smartphone className="w-4 h-4 text-text-muted" />
          <h3 className="text-sm font-semibold text-text-primary">Double authentification (2FA)</h3>
          <div className="flex-1 h-px bg-surface-border ml-2" />
        </div>

        <div className="p-4 rounded-xl bg-background border border-surface-border">
          <div className="flex items-center justify-between">
            <div className="flex items-start gap-3">
              <Shield className={clsx("w-4 h-4 flex-shrink-0 mt-0.5", twoFA ? "text-success" : "text-text-muted")} />
              <div>
                <div className="flex items-center gap-2">
                  <p className="text-sm font-medium text-text-primary">Authentificateur TOTP</p>
                  {twoFA && <Badge variant="success" size="sm">Actif</Badge>}
                </div>
                <p className="text-xs text-text-muted mt-0.5">Google Authenticator, Authy, ou similaire</p>
              </div>
            </div>
            <Toggle checked={twoFA} onChange={(v) => { setTwoFA(v); if (v) setTwoFAStep("setup"); else setTwoFAStep("idle"); }} />
          </div>

          {twoFAStep === "setup" && (
            <div className="mt-4 pt-4 border-t border-surface-border space-y-4">
              <p className="text-xs text-text-muted">Scannez ce QR code avec votre application d&apos;authentification :</p>
              <div className="w-32 h-32 rounded-xl bg-white flex items-center justify-center mx-auto">
                <div className="grid grid-cols-5 gap-0.5">
                  {Array.from({ length: 25 }).map((_, i) => (
                    <div key={i} className={clsx("w-5 h-5", Math.random() > 0.5 ? "bg-black" : "bg-white")} />
                  ))}
                </div>
              </div>
              <div>
                <label className="field-label">Code de vérification</label>
                <input type="text" maxLength={6} className="input-field w-full text-sm font-mono text-center tracking-[0.5em]" placeholder="000000" />
              </div>
              <button
                onClick={() => setTwoFAStep("done")}
                className="w-full py-2 rounded-xl bg-primary text-background text-sm font-semibold hover:bg-primary-400 transition-colors"
              >
                Confirmer
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Sessions */}
      <div>
        <div className="flex items-center gap-2 mb-4">
          <Monitor className="w-4 h-4 text-text-muted" />
          <h3 className="text-sm font-semibold text-text-primary">Sessions actives</h3>
          <div className="flex-1 h-px bg-surface-border ml-2" />
        </div>
        <div className="p-4 rounded-xl bg-background border border-surface-border">
          <div className="flex items-center justify-between">
            <div className="flex items-start gap-3">
              <Monitor className="w-4 h-4 text-text-muted flex-shrink-0 mt-0.5" />
              <div>
                <div className="flex items-center gap-2">
                  <p className="text-sm font-medium text-text-primary">Session actuelle</p>
                  <Badge variant="success" size="sm">Actuelle</Badge>
                </div>
                <p className="text-[10px] text-text-muted mt-0.5">Navigateur actuel</p>
              </div>
            </div>
            <button
              onClick={async () => {
                const supabase = createBrowserClient();
                await supabase.auth.signOut({ scope: "global" });
                window.location.href = "/login";
              }}
              className="text-xs text-status-error hover:text-status-error/80 font-medium flex items-center gap-1 transition-colors"
            >
              <LogOut className="w-3.5 h-3.5" /> Déconnecter tout
            </button>
          </div>
        </div>
      </div>

      <div className="flex justify-end">
        <button
          onClick={handleSave}
          disabled={saving}
          className={clsx(
            "flex items-center gap-2 px-5 py-2.5 rounded-xl font-semibold text-sm transition-all",
            saved ? "bg-primary/20 text-primary border border-primary/30" : "bg-primary text-background hover:bg-primary-400 hover:shadow-glow disabled:opacity-60"
          )}
        >
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
          {saved ? "Enregistré ✓" : saving ? "Enregistrement…" : "Enregistrer le mot de passe"}
        </button>
      </div>
    </div>
  );
}
