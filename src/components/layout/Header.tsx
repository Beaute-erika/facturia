"use client";

import { Bell, Search, Plus, ChevronDown, Menu } from "lucide-react";

interface HeaderProps {
  onMenuToggle: () => void;
}

export default function Header({ onMenuToggle }: HeaderProps) {
  return (
    <header className="h-14 md:h-16 border-b border-surface-border bg-background-secondary/50 backdrop-blur-sm flex items-center gap-3 px-4 md:px-6 flex-shrink-0">
      {/* Hamburger — mobile only */}
      <button
        onClick={onMenuToggle}
        className="md:hidden w-9 h-9 flex items-center justify-center rounded-xl text-text-secondary hover:text-text-primary hover:bg-surface-hover transition-all flex-shrink-0"
      >
        <Menu className="w-5 h-5" />
      </button>

      {/* Search — desktop only */}
      <div className="hidden md:flex flex-1 max-w-md relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
        <input
          type="text"
          placeholder="Rechercher un client, devis, facture..."
          className="input-field w-full pl-9 py-2 text-sm"
        />
        <kbd className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] text-text-muted bg-surface border border-surface-border px-1.5 py-0.5 rounded font-mono">
          ⌘K
        </kbd>
      </div>

      {/* Mobile: app name centered */}
      <span className="md:hidden flex-1 text-base font-bold text-text-primary tracking-tight">
        Facturia
      </span>

      <div className="flex items-center gap-2 ml-auto">
        <button className="btn-primary flex items-center gap-1.5 md:gap-2 text-sm px-3 md:px-4 py-2">
          <Plus className="w-4 h-4" strokeWidth={2.5} />
          <span className="hidden md:inline">Nouveau</span>
          <ChevronDown className="hidden md:inline w-3.5 h-3.5 opacity-70" />
        </button>

        <button className="relative w-9 h-9 flex items-center justify-center rounded-xl text-text-secondary hover:text-text-primary hover:bg-surface-hover transition-all">
          <Bell className="w-[18px] h-[18px]" />
          <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-status-error rounded-full border-2 border-background-secondary" />
        </button>
      </div>
    </header>
  );
}
