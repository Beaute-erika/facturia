"use client";

import { Bell, Search, Plus, ChevronDown } from "lucide-react";

export default function Header() {
  return (
    <header className="h-16 border-b border-surface-border bg-background-secondary/50 backdrop-blur-sm flex items-center gap-4 px-6">
      {/* Search */}
      <div className="flex-1 max-w-md relative">
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

      <div className="flex items-center gap-2 ml-auto">
        {/* Quick action */}
        <button className="btn-primary flex items-center gap-2 text-sm">
          <Plus className="w-4 h-4" strokeWidth={2.5} />
          <span>Nouveau</span>
          <ChevronDown className="w-3.5 h-3.5 opacity-70" />
        </button>

        {/* Notifications */}
        <button className="relative w-9 h-9 flex items-center justify-center rounded-xl text-text-secondary hover:text-text-primary hover:bg-surface-hover transition-all">
          <Bell className="w-[18px] h-[18px]" />
          <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-status-error rounded-full border-2 border-background-secondary" />
        </button>
      </div>
    </header>
  );
}
