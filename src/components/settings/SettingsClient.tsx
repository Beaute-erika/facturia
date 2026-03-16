"use client";

import { useState } from "react";
import { User, FileText, Bell, Building, Shield, CreditCard, Sparkles } from "lucide-react";
import { clsx } from "clsx";
import ProfileSection from "./sections/ProfileSection";
import FacturationSection from "./sections/FacturationSection";
import NotificationsSection from "./sections/NotificationsSection";
import ChorusSection from "./sections/ChorusSection";
import SecuritySection from "./sections/SecuritySection";
import SubscriptionSection from "./sections/SubscriptionSection";
import AISection from "./sections/AISection";

type SectionId = "profile" | "facturation" | "notifications" | "chorus" | "security" | "subscription" | "ai";

const NAV_ITEMS: { id: SectionId; label: string; icon: React.ElementType; badge?: string }[] = [
  { id: "profile", label: "Profil artisan", icon: User },
  { id: "facturation", label: "Facturation", icon: FileText },
  { id: "notifications", label: "Notifications", icon: Bell },
  { id: "chorus", label: "Chorus Pro", icon: Building },
  { id: "security", label: "Sécurité", icon: Shield },
  { id: "subscription", label: "Abonnement", icon: CreditCard },
  { id: "ai", label: "Agent IA", icon: Sparkles, badge: "Pro" },
];

const SECTION_TITLES: Record<SectionId, string> = {
  profile: "Profil artisan",
  facturation: "Facturation",
  notifications: "Notifications",
  chorus: "Chorus Pro",
  security: "Sécurité",
  subscription: "Abonnement",
  ai: "Agent IA",
};

const SECTION_DESCS: Record<SectionId, string> = {
  profile: "Vos informations professionnelles et coordonnées",
  facturation: "Numérotation, TVA, coordonnées bancaires et apparence",
  notifications: "Gérez vos alertes email et SMS",
  chorus: "Connexion à la plateforme de facturation publique",
  security: "Mot de passe, double authentification et sessions",
  subscription: "Votre plan actuel, facturation et historique",
  ai: "Personnalisez le comportement de l'assistant IA",
};

export default function SettingsClient() {
  const [active, setActive] = useState<SectionId>("profile");
  const [savedSection, setSavedSection] = useState<SectionId | null>(null);

  const handleSave = (section: SectionId) => {
    setSavedSection(section);
    setTimeout(() => setSavedSection(null), 3000);
  };

  return (
    <div className="flex gap-6 h-full min-h-0">
      {/* Sidebar nav */}
      <aside className="w-52 flex-shrink-0">
        <nav className="space-y-0.5">
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            const isSaved = savedSection === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setActive(item.id)}
                className={clsx(
                  "w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left transition-all text-sm",
                  active === item.id
                    ? "bg-primary/10 text-primary font-semibold"
                    : "text-text-muted hover:bg-surface-active hover:text-text-primary"
                )}
              >
                <Icon className="w-4 h-4 flex-shrink-0" />
                <span className="flex-1">{item.label}</span>
                {item.badge && (
                  <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-md bg-primary/10 text-primary">
                    {item.badge}
                  </span>
                )}
                {isSaved && (
                  <span className="text-[9px] text-success font-bold">✓</span>
                )}
              </button>
            );
          })}
        </nav>
      </aside>

      {/* Content */}
      <div className="flex-1 min-w-0 overflow-y-auto">
        <div className="mb-6">
          <h2 className="text-lg font-bold text-text-primary">{SECTION_TITLES[active]}</h2>
          <p className="text-xs text-text-muted mt-0.5">{SECTION_DESCS[active]}</p>
        </div>

        <div>
          {active === "profile" && <ProfileSection onSave={() => handleSave("profile")} />}
          {active === "facturation" && <FacturationSection onSave={() => handleSave("facturation")} />}
          {active === "notifications" && <NotificationsSection onSave={() => handleSave("notifications")} />}
          {active === "chorus" && <ChorusSection onSave={() => handleSave("chorus")} />}
          {active === "security" && <SecuritySection onSave={() => handleSave("security")} />}
          {active === "subscription" && <SubscriptionSection />}
          {active === "ai" && <AISection onSave={() => handleSave("ai")} />}
        </div>
      </div>
    </div>
  );
}
