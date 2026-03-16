"use client";

import { useState } from "react";
import { X, User, Building2, Landmark, Phone, Mail, MapPin, FileText, Tag } from "lucide-react";
import { clsx } from "clsx";
import type { Client, ClientType, ClientStatus } from "@/lib/clients-data";

interface NewClientModalProps {
  onClose: () => void;
  onSave: (client: Client) => void;
}

type Step = "info" | "contact";

const TYPES: ClientType[] = ["Particulier", "Professionnel", "Public"];
const TYPE_ICONS = { Particulier: User, Professionnel: Building2, Public: Landmark };

export default function NewClientModal({ onClose, onSave }: NewClientModalProps) {
  const [step, setStep] = useState<Step>("info");
  const [form, setForm] = useState({
    name: "", type: "Particulier" as ClientType,
    address: "", city: "", email: "", phone: "",
    siret: "", contactName: "", tags: "",
    notes: "",
  });

  const set = (k: string, v: string) => setForm((f) => ({ ...f, [k]: v }));
  const canNext = form.name.trim().length >= 2;
  const canSave = canNext && form.email.trim() && form.phone.trim();

  const handleSave = () => {
    const newClient: Client = {
      id: Date.now(),
      name: form.name,
      type: form.type,
      status: "prospect" as ClientStatus,
      city: form.city,
      address: form.address,
      phone: form.phone,
      email: form.email,
      siret: form.siret || undefined,
      contactName: form.contactName || undefined,
      ca: 0,
      chantiers: 0,
      createdAt: new Date().toLocaleDateString("fr-FR", { month: "long", year: "numeric" }),
      lastActivity: new Date().toLocaleDateString("fr-FR", { day: "2-digit", month: "short", year: "numeric" }),
      tags: form.tags ? form.tags.split(",").map((t) => t.trim()).filter(Boolean) : [],
      documents: [],
      chantiersList: [],
      notes: form.notes
        ? [{ id: `n-${Date.now()}`, content: form.notes, date: new Date().toLocaleDateString("fr-FR", { day: "2-digit", month: "short", year: "numeric" }), author: "Jean Dupont" }]
        : [],
    };
    onSave(newClient);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-lg bg-background-secondary border border-surface-border rounded-2xl shadow-card animate-fade-in overflow-hidden">
        {/* Header */}
        <div className="flex items-center gap-3 px-5 py-4 border-b border-surface-border">
          <div className="w-8 h-8 rounded-xl bg-primary/10 flex items-center justify-center">
            <User className="w-4 h-4 text-primary" />
          </div>
          <div className="flex-1">
            <h2 className="font-semibold text-text-primary">Nouveau client</h2>
            <div className="flex gap-1 mt-0.5">
              {(["info", "contact"] as Step[]).map((s) => (
                <div key={s} className={clsx("h-1 rounded-full transition-all", step === s ? "w-8 bg-primary" : "w-4 bg-surface-border")} />
              ))}
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg text-text-muted hover:text-text-primary hover:bg-surface-hover transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-5 space-y-4">
          {step === "info" && (
            <div className="space-y-4 animate-fade-in">
              {/* Type */}
              <div>
                <label className="text-xs font-semibold text-text-muted uppercase tracking-wider mb-2 block">Type de client</label>
                <div className="grid grid-cols-3 gap-2">
                  {TYPES.map((t) => {
                    const Icon = TYPE_ICONS[t];
                    return (
                      <button
                        key={t}
                        onClick={() => set("type", t)}
                        className={clsx(
                          "flex flex-col items-center gap-2 p-3 rounded-xl border transition-all text-sm font-medium",
                          form.type === t
                            ? "bg-primary/10 border-primary/30 text-primary"
                            : "border-surface-border text-text-muted hover:border-surface-active hover:text-text-primary"
                        )}
                      >
                        <Icon className="w-5 h-5" />
                        {t}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Name */}
              <div>
                <label className="text-xs font-semibold text-text-muted uppercase tracking-wider mb-1.5 block">
                  {form.type === "Particulier" ? "Nom et prénom" : "Raison sociale"}
                </label>
                <input
                  value={form.name}
                  onChange={(e) => set("name", e.target.value)}
                  placeholder={form.type === "Particulier" ? "Ex: Jean Dupont" : "Ex: SCI Verdure"}
                  className="input-field w-full text-sm"
                  autoFocus
                />
              </div>

              {/* Contact name for pro/public */}
              {form.type !== "Particulier" && (
                <div>
                  <label className="text-xs font-semibold text-text-muted uppercase tracking-wider mb-1.5 block">Contact principal</label>
                  <input
                    value={form.contactName}
                    onChange={(e) => set("contactName", e.target.value)}
                    placeholder="Ex: M. Dupont (Directeur)"
                    className="input-field w-full text-sm"
                  />
                </div>
              )}

              {/* SIRET for pro/public */}
              {form.type !== "Particulier" && (
                <div>
                  <label className="text-xs font-semibold text-text-muted uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                    <Building2 className="w-3.5 h-3.5" /> SIRET
                  </label>
                  <input
                    value={form.siret}
                    onChange={(e) => set("siret", e.target.value)}
                    placeholder="123 456 789 00012"
                    className="input-field w-full text-sm font-mono"
                  />
                </div>
              )}

              {/* Tags */}
              <div>
                <label className="text-xs font-semibold text-text-muted uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                  <Tag className="w-3.5 h-3.5" /> Tags (séparés par virgule)
                </label>
                <input
                  value={form.tags}
                  onChange={(e) => set("tags", e.target.value)}
                  placeholder="Ex: VIP, Fidèle, Marché public"
                  className="input-field w-full text-sm"
                />
              </div>

              <button
                onClick={() => setStep("contact")}
                disabled={!canNext}
                className="btn-primary w-full justify-center disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Continuer →
              </button>
            </div>
          )}

          {step === "contact" && (
            <div className="space-y-4 animate-fade-in">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-text-muted uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                    <Phone className="w-3.5 h-3.5" /> Téléphone *
                  </label>
                  <input
                    value={form.phone}
                    onChange={(e) => set("phone", e.target.value)}
                    placeholder="06 12 34 56 78"
                    className="input-field w-full text-sm"
                    autoFocus
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-text-muted uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                    <Mail className="w-3.5 h-3.5" /> Email *
                  </label>
                  <input
                    type="email"
                    value={form.email}
                    onChange={(e) => set("email", e.target.value)}
                    placeholder="email@exemple.fr"
                    className="input-field w-full text-sm"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-text-muted uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                  <MapPin className="w-3.5 h-3.5" /> Adresse
                </label>
                <input
                  value={form.address}
                  onChange={(e) => set("address", e.target.value)}
                  placeholder="42 rue de la Paix"
                  className="input-field w-full text-sm mb-2"
                />
                <input
                  value={form.city}
                  onChange={(e) => set("city", e.target.value)}
                  placeholder="75001 Paris"
                  className="input-field w-full text-sm"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-text-muted uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                  <FileText className="w-3.5 h-3.5" /> Note initiale
                </label>
                <textarea
                  value={form.notes}
                  onChange={(e) => set("notes", e.target.value)}
                  placeholder="Comment avez-vous connu ce client ? Informations utiles…"
                  rows={3}
                  className="input-field w-full text-sm resize-none"
                />
              </div>

              <div className="flex gap-2">
                <button
                  onClick={() => setStep("info")}
                  className="btn-ghost flex-1 text-center py-2.5 rounded-xl border border-surface-border text-sm"
                >
                  ← Retour
                </button>
                <button
                  onClick={handleSave}
                  disabled={!canSave}
                  className="btn-primary flex-1 justify-center disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Créer le client
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
