"use client";

import { useEffect, useState, useMemo } from "react";
import { X, Search, Package, Loader2, Plus } from "lucide-react";
import { clsx } from "clsx";
import type { ServiceRow } from "@/lib/database.types";

interface Props {
  onClose:  () => void;
  onSelect: (service: ServiceRow) => void;
}

const fmt = (n: number) =>
  n.toLocaleString("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export default function ServicePickerModal({ onClose, onSelect }: Props) {
  const [services, setServices] = useState<ServiceRow[]>([]);
  const [loading,  setLoading]  = useState(true);
  const [search,   setSearch]   = useState("");

  useEffect(() => {
    fetch("/api/services")
      .then((r) => r.json())
      .then((d) => { setServices(d.services ?? []); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    if (!q) return services;
    return services.filter(
      (s) =>
        s.name.toLowerCase().includes(q) ||
        (s.category?.toLowerCase().includes(q) ?? false)
    );
  }, [services, search]);

  // Group by category
  const grouped = useMemo(() => {
    const map = new Map<string, ServiceRow[]>();
    for (const s of filtered) {
      const key = s.category || "Sans catégorie";
      const arr = map.get(key) ?? [];
      arr.push(s);
      map.set(key, arr);
    }
    return Array.from(map.entries()).sort(([a], [b]) => {
      if (a === "Sans catégorie") return 1;
      if (b === "Sans catégorie") return -1;
      return a.localeCompare(b, "fr");
    });
  }, [filtered]);

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />

      <div className="relative z-10 w-full max-w-lg max-h-[80vh] flex flex-col bg-surface border border-surface-border rounded-2xl shadow-card">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-surface-border flex-shrink-0">
          <div className="flex items-center gap-2">
            <Package className="w-4 h-4 text-primary" />
            <h2 className="text-base font-bold text-text-primary">Mes services</h2>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl text-text-muted hover:text-text-primary hover:bg-surface-active transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Search */}
        <div className="px-4 py-3 border-b border-surface-border flex-shrink-0">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-text-muted" />
            <input
              autoFocus
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Rechercher un service…"
              className="input-field w-full text-sm pl-8"
            />
          </div>
        </div>

        {/* List */}
        <div className="overflow-y-auto flex-1">
          {loading ? (
            <div className="flex items-center justify-center py-12 gap-2 text-text-muted">
              <Loader2 className="w-4 h-4 animate-spin" />
              <span className="text-sm">Chargement…</span>
            </div>
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 gap-3 text-text-muted">
              <Package className="w-8 h-8 opacity-30" />
              <p className="text-sm text-center">
                {search ? "Aucun service trouvé" : "Vous n'avez pas encore créé de services"}
              </p>
              {!search && (
                <a
                  href="/services"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1.5 text-xs text-primary hover:text-primary-400 font-medium transition-colors"
                >
                  <Plus className="w-3.5 h-3.5" /> Créer mes services
                </a>
              )}
            </div>
          ) : (
            <div className="py-2">
              {grouped.map(([category, items]) => (
                <div key={category}>
                  <p className="px-4 py-1.5 text-[10px] font-semibold text-text-muted uppercase tracking-wider bg-background sticky top-0">
                    {category}
                  </p>
                  {items.map((service) => (
                    <button
                      key={service.id}
                      type="button"
                      onClick={() => { onSelect(service); onClose(); }}
                      className={clsx(
                        "w-full px-4 py-3 text-left hover:bg-surface-active transition-colors",
                        "flex items-start justify-between gap-4"
                      )}
                    >
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-text-primary truncate">{service.name}</p>
                        {service.description && (
                          <p className="text-xs text-text-muted mt-0.5 line-clamp-2 leading-relaxed">
                            {service.description}
                          </p>
                        )}
                      </div>
                      <div className="flex-shrink-0 text-right">
                        <p className="text-sm font-bold font-mono text-text-primary">
                          {fmt(service.price_ht)} €
                        </p>
                        <p className="text-[10px] text-text-muted">HT</p>
                      </div>
                    </button>
                  ))}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
