"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import {
  LayoutDashboard, Users, FileText, Receipt, HardHat, BarChart3,
  Settings, Zap, Building2, ChevronRight, LogOut, Sparkles, X,
} from "lucide-react";
import { clsx } from "clsx";
import { createBrowserClient } from "@/lib/supabase-client";

interface SidebarProps {
  onClose?: () => void;
}

interface Counts {
  clients: number;
  devis: number;
  factures: number;
}

interface Profile {
  prenom: string;
  nom: string;
  metier: string;
  ville: string | null;
}

const navItems = [
  { label: "Dashboard", href: "/app", icon: LayoutDashboard },
  { label: "Clients",   href: "/clients",  icon: Users,    countKey: "clients"  as const },
  { label: "Devis",     href: "/devis",    icon: FileText, countKey: "devis"    as const, badgeType: "warning" as const },
  { label: "Factures",  href: "/factures", icon: Receipt,  countKey: "factures" as const, badgeType: "error"   as const },
  { label: "Chantiers", href: "/chantiers", icon: HardHat },
  { label: "Analytics", href: "/analytics", icon: BarChart3 },
];

const bottomItems = [{ label: "Paramètres", href: "/settings", icon: Settings }];

const badgeColors = {
  default: "bg-surface-active text-text-secondary",
  warning:  "bg-status-warning/20 text-status-warning",
  error:    "bg-status-error/20 text-status-error",
};

export default function Sidebar({ onClose }: SidebarProps) {
  const pathname = usePathname();
  const [counts, setCounts]   = useState<Counts>({ clients: 0, devis: 0, factures: 0 });
  const [profile, setProfile] = useState<Profile | null>(null);

  useEffect(() => {
    const supabase = createBrowserClient();

    supabase.auth.getUser().then(async ({ data: { user } }) => {
      if (!user) return;

      // Profil artisan
      const { data: prof } = await supabase
        .from("users")
        .select("prenom, nom, metier, ville")
        .eq("id", user.id)
        .single();
      if (prof) setProfile(prof);

      // Counts en parallèle
      const [clientsRes, devisRes, facturesRes] = await Promise.all([
        supabase
          .from("clients")
          .select("*", { count: "exact", head: true })
          .eq("user_id", user.id),
        supabase
          .from("devis")
          .select("*", { count: "exact", head: true })
          .eq("user_id", user.id)
          .eq("statut", "envoye"),
        supabase
          .from("factures")
          .select("*", { count: "exact", head: true })
          .eq("user_id", user.id)
          .in("statut", ["envoyee", "en_retard"]),
      ]);

      setCounts({
        clients:  clientsRes.count  ?? 0,
        devis:    devisRes.count    ?? 0,
        factures: facturesRes.count ?? 0,
      });
    }).catch(() => {});
  }, []);

  const initials = profile
    ? `${profile.prenom?.[0] ?? ""}${profile.nom?.[0] ?? ""}`.toUpperCase()
    : "?";
  const displayName = profile ? `${profile.prenom} ${profile.nom}` : "—";
  const displayJob  = profile
    ? [profile.metier, profile.ville].filter(Boolean).join(" — ")
    : "";

  return (
    <aside className="w-64 h-full flex flex-col bg-background-secondary border-r border-surface-border">
      {/* Logo */}
      <div className="px-5 py-5 border-b border-surface-border flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 bg-primary rounded-xl flex items-center justify-center shadow-glow">
            <Zap className="w-5 h-5 text-background" strokeWidth={2.5} />
          </div>
          <div>
            <span className="text-lg font-bold text-text-primary tracking-tight">Facturia</span>
            <div className="flex items-center gap-1.5">
              <span className="text-[10px] text-text-muted font-medium uppercase tracking-wider">Pro Plan</span>
              <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
            </div>
          </div>
        </div>
        <button
          onClick={onClose}
          className="md:hidden w-8 h-8 flex items-center justify-center rounded-xl text-text-muted hover:text-text-primary hover:bg-surface-hover transition-all"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* User info */}
      <div className="px-4 py-3 border-b border-surface-border">
        <div className="flex items-center gap-3 p-2 rounded-xl hover:bg-surface-hover transition-colors cursor-pointer">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary/30 to-primary/10 flex items-center justify-center border border-primary/20 flex-shrink-0">
            <span className="text-sm font-bold text-primary">{initials}</span>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-text-primary truncate">{displayName}</p>
            {displayJob && <p className="text-xs text-text-muted truncate">{displayJob}</p>}
          </div>
          <ChevronRight className="w-4 h-4 text-text-muted flex-shrink-0" />
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
        <p className="px-3 mb-2 text-[10px] font-semibold text-text-muted uppercase tracking-widest">Navigation</p>
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = pathname === item.href;
          const count = item.countKey ? counts[item.countKey] : 0;
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={onClose}
              className={clsx("sidebar-item", isActive && "active")}
            >
              <Icon className="w-[18px] h-[18px] flex-shrink-0" strokeWidth={isActive ? 2.5 : 2} />
              <span className="flex-1 text-sm font-medium">{item.label}</span>
              {count > 0 && (
                <span className={clsx(
                  "text-[10px] font-bold px-1.5 py-0.5 rounded-md min-w-[20px] text-center",
                  item.badgeType ? badgeColors[item.badgeType] : badgeColors.default
                )}>
                  {count}
                </span>
              )}
            </Link>
          );
        })}

        <div className="pt-4 pb-1">
          <p className="px-3 mb-2 text-[10px] font-semibold text-text-muted uppercase tracking-widest">Intelligence</p>
        </div>
        <button className="sidebar-item w-full group">
          <div className="w-[18px] h-[18px] flex-shrink-0 relative">
            <Sparkles className="w-full h-full" strokeWidth={2} />
            <span className="absolute -top-0.5 -right-0.5 w-2 h-2 bg-primary rounded-full border border-background-secondary animate-pulse" />
          </div>
          <span className="flex-1 text-sm font-medium text-left">Agent IA</span>
          <span className="text-[10px] font-semibold text-primary bg-primary/10 px-1.5 py-0.5 rounded-md">BETA</span>
        </button>
        <button className="sidebar-item w-full">
          <Building2 className="w-[18px] h-[18px] flex-shrink-0" strokeWidth={2} />
          <span className="flex-1 text-sm font-medium text-left">Chorus Pro</span>
          <span className="w-2 h-2 rounded-full bg-status-success" />
        </button>
      </nav>

      {/* Bottom section */}
      <div className="px-3 py-3 border-t border-surface-border space-y-0.5">
        {bottomItems.map((item) => {
          const Icon = item.icon;
          const isActive = pathname === item.href;
          return (
            <Link key={item.href} href={item.href} onClick={onClose} className={clsx("sidebar-item", isActive && "active")}>
              <Icon className="w-[18px] h-[18px] flex-shrink-0" strokeWidth={2} />
              <span className="text-sm font-medium">{item.label}</span>
            </Link>
          );
        })}
        <button className="sidebar-item w-full text-status-error hover:text-status-error hover:bg-status-error/10">
          <LogOut className="w-[18px] h-[18px] flex-shrink-0" strokeWidth={2} />
          <span className="text-sm font-medium">Déconnexion</span>
        </button>
      </div>
    </aside>
  );
}
