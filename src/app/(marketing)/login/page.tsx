"use client";

import Link from "next/link";
import { useState } from "react";
import { Mail, Lock, Eye, EyeOff, ArrowRight, Loader2 } from "lucide-react";
import type { Metadata } from "next";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPwd, setShowPwd] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (!email || !password) { setError("Remplissez tous les champs."); return; }
    setLoading(true);
    // TODO: Supabase auth.signInWithPassword
    await new Promise((r) => setTimeout(r, 800));
    setLoading(false);
    window.location.href = "/app";
  };

  return (
    <div className="min-h-[calc(100vh-64px)] flex items-center justify-center px-6 py-20">
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="w-12 h-12 rounded-2xl bg-primary flex items-center justify-center text-background text-2xl font-black mx-auto mb-4">F</div>
          <h1 className="text-2xl font-black text-text-primary">Bon retour !</h1>
          <p className="text-text-muted text-sm mt-1">Connectez-vous à votre espace Facturia</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
              {error}
            </div>
          )}

          <div>
            <label className="field-label">Email</label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="jean@plomberie.fr"
                className="input-field w-full pl-10 text-sm"
                autoComplete="email"
              />
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="field-label mb-0">Mot de passe</label>
              <Link href="/forgot-password" className="text-xs text-primary hover:text-primary-400 transition-colors">
                Mot de passe oublié ?
              </Link>
            </div>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
              <input
                type={showPwd ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="input-field w-full pl-10 pr-10 text-sm"
                autoComplete="current-password"
              />
              <button
                type="button"
                onClick={() => setShowPwd((v) => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted hover:text-text-primary transition-colors"
              >
                {showPwd ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-primary text-background font-bold text-sm hover:bg-primary-400 hover:shadow-glow transition-all disabled:opacity-60"
          >
            {loading ? <><Loader2 className="w-4 h-4 animate-spin" /> Connexion…</> : <>Se connecter <ArrowRight className="w-4 h-4" /></>}
          </button>
        </form>

        <p className="text-center text-sm text-text-muted mt-6">
          Pas encore de compte ?{" "}
          <Link href="/signup" className="text-primary font-semibold hover:text-primary-400 transition-colors">
            Créer un compte gratuit
          </Link>
        </p>
      </div>
    </div>
  );
}
