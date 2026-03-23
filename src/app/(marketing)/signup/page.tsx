"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useState, Suspense } from "react";
import { Mail, Lock, Eye, EyeOff, User, ArrowRight, Loader2, CheckCircle2 } from "lucide-react";
import { createBrowserClient } from "@/lib/supabase-client";

const METIERS = ["Plombier", "Électricien", "Maçon", "Carreleur", "Peintre", "Menuisier", "Couvreur", "Chauffagiste", "Autre"];

function SignupForm() {
  const params = useSearchParams();
  const plan = params.get("plan") ?? "starter";

  const [form, setForm] = useState({ prenom: "", nom: "", email: "", metier: "Plombier", password: "" });
  const [showPwd, setShowPwd] = useState(false);
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState("");

  const set = (k: string, v: string) => setForm((f) => ({ ...f, [k]: v }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (!form.prenom || !form.email || !form.password) { setError("Remplissez tous les champs obligatoires."); return; }
    if (form.password.length < 8) { setError("Le mot de passe doit contenir au moins 8 caractères."); return; }
    setLoading(true);
    const supabase = createBrowserClient();
    const { error: signUpError } = await supabase.auth.signUp({
      email: form.email,
      password: form.password,
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback`,
        data: {
          prenom: form.prenom,
          nom: form.nom,
          metier: form.metier,
          plan,
        },
      },
    });
    setLoading(false);
    if (signUpError) {
      if (signUpError.message.includes("already registered") || signUpError.message.includes("already been registered")) {
        setError("Un compte existe déjà avec cet email.");
      } else {
        setError(signUpError.message);
      }
      return;
    }
    setDone(true);
  };

  if (done) {
    return (
      <div className="min-h-[calc(100vh-64px)] flex items-center justify-center px-6">
        <div className="text-center max-w-sm">
          <div className="w-16 h-16 rounded-2xl bg-primary/10 border border-primary/30 flex items-center justify-center mx-auto mb-6">
            <CheckCircle2 className="w-8 h-8 text-primary" />
          </div>
          <h2 className="text-2xl font-black text-text-primary mb-3">Vérifiez votre email</h2>
          <p className="text-text-muted text-sm leading-relaxed mb-6">
            Un lien de confirmation a été envoyé à <strong className="text-text-primary">{form.email}</strong>.
            Cliquez sur le lien pour activer votre compte.
          </p>
          <Link href="/login" className="text-primary font-semibold text-sm hover:text-primary-400 transition-colors">
            Retour à la connexion →
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-[calc(100vh-64px)] flex items-center justify-center px-6 py-20">
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="w-12 h-12 rounded-2xl bg-primary flex items-center justify-center text-background text-2xl font-black mx-auto mb-4">F</div>
          <h1 className="text-2xl font-black text-text-primary">Créer votre compte</h1>
          <p className="text-text-muted text-sm mt-1">
            Plan{" "}
            <span className="text-primary font-semibold capitalize">{plan}</span>
            {" · "}Gratuit, sans carte bancaire
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
              {error}
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="field-label">Prénom <span className="text-status-error">*</span></label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-text-muted" />
                <input value={form.prenom} onChange={(e) => set("prenom", e.target.value)} placeholder="Jean" className="input-field w-full pl-9 text-sm" />
              </div>
            </div>
            <div>
              <label className="field-label">Nom</label>
              <input value={form.nom} onChange={(e) => set("nom", e.target.value)} placeholder="Dupont" className="input-field w-full text-sm" />
            </div>
          </div>

          <div>
            <label className="field-label">Métier</label>
            <select value={form.metier} onChange={(e) => set("metier", e.target.value)} className="input-field w-full text-sm">
              {METIERS.map((m) => <option key={m}>{m}</option>)}
            </select>
          </div>

          <div>
            <label className="field-label">Email <span className="text-status-error">*</span></label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
              <input type="email" value={form.email} onChange={(e) => set("email", e.target.value)} placeholder="jean@plomberie.fr" className="input-field w-full pl-10 text-sm" autoComplete="email" />
            </div>
          </div>

          <div>
            <label className="field-label">Mot de passe <span className="text-status-error">*</span></label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
              <input
                type={showPwd ? "text" : "password"}
                value={form.password}
                onChange={(e) => set("password", e.target.value)}
                placeholder="8 caractères minimum"
                className="input-field w-full pl-10 pr-10 text-sm"
                autoComplete="new-password"
              />
              <button type="button" onClick={() => setShowPwd((v) => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted hover:text-text-primary transition-colors">
                {showPwd ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-primary text-background font-bold text-sm hover:bg-primary-400 hover:shadow-glow transition-all disabled:opacity-60"
          >
            {loading ? <><Loader2 className="w-4 h-4 animate-spin" /> Création…</> : <>Créer mon compte <ArrowRight className="w-4 h-4" /></>}
          </button>

          <p className="text-[11px] text-text-muted text-center leading-relaxed">
            En créant un compte, vous acceptez nos{" "}
            <Link href="/cgv" className="text-primary hover:underline">CGV</Link>
            {" "}et notre{" "}
            <Link href="/confidentialite" className="text-primary hover:underline">politique de confidentialité</Link>.
          </p>
        </form>

        <p className="text-center text-sm text-text-muted mt-6">
          Déjà un compte ?{" "}
          <Link href="/login" className="text-primary font-semibold hover:text-primary-400 transition-colors">
            Se connecter
          </Link>
        </p>
      </div>
    </div>
  );
}

export default function SignupPage() {
  return (
    <Suspense fallback={<div className="min-h-screen" />}>
      <SignupForm />
    </Suspense>
  );
}
