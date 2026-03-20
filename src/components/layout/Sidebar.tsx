"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard, Users, FileText, Receipt, HardHat, BarChart3,
  Settings, Zap, Building2, ChevronRight, LogOut, Sparkles, X,
} from "lucide-react";
import { clsx } from "clsx";

interface SidebarProps {
  onClose?: () => void;
}

const navItems = [
  { label: "Dashboard", href: "/app", icon: LayoutDashboard },
  { label: "Clients", href: "/clients", icon: Users, badge: "124" },
  { label: "Devis", href: "/devis", icon: FileText, badge: "8", badgeType: "warning" as const },
  { label: "Factures", href: "/factures", icon: Receipt, badge: "3", badgeType: "error" as const },
  { label: "Chantiers", href: "/chantiers", icon: HardHat },
  { label: "Analytics", href: "/analytics", icon: BarChart3 },
];

const bottomItems = [{ label: "Paramètres", href: "/settings", icon: Settings }];

const badgeColors = {
  default: "bg-surface-active text-text-secondary",
  warning: "bg-status-warning/20 text-status-warning",
  error: "bg-status-error/20 text-status-error",
  success: "bg-primary/20 text-primary",
};

export default function Sidebar({ onClose }: SidebarProps) {
  const pathname = usePathname();

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
        {/* Close button — mobile only */}
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
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary/30 to-primary/10 flex items-center justify-center border border-primary/20">
            <span className="text-sm font-bold text-primary">JD</span>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-text-primary truncate">Jean Dupont</p>
            <p className="text-xs text-text-muted truncate">Plombier — Paris 15e</p>
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
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={onClose}
              className={clsx("sidebar-item", isActive && "active")}
            >
              <Icon className="w-[18px] h-[18px] flex-shrink-0" strokeWidth={isActive ? 2.5 : 2} />
              <span className="flex-1 text-sm font-medium">{item.label}</span>
              {item.badge && (
                <span className={clsx(
                  "text-[10px] font-bold px-1.5 py-0.5 rounded-md min-w-[20px] text-center",
                  item.badgeType ? badgeColors[item.badgeType] : badgeColors.default
                )}>
                  {item.badge}
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
