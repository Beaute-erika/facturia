"use client";

import { useState, useEffect } from "react";
import {
  Plus, Search, Phone, Mail, MapPin, MoreHorizontal,
  Users, TrendingUp, Star, UserPlus, ChevronRight,
} from "lucide-react";
import { clsx } from "clsx";
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import Badge from "@/components/ui/Badge";
import ClientDrawer from "./ClientDrawer";
import NewClientModal from "./NewClientModal";
import { type Client, type ClientType } from "@/lib/clients-data";

type Filter = "Tous" | "Particuliers" | "Professionnels" | "Public";
type StatusFilter = "Tous" | "actif" | "prospect" | "inactif" | "devis";

const TYPE_BADGE: Record<ClientType, { variant: "success" | "warning" | "info" | "default" }> = {
  Particulier: { variant: "default" },
  Professionnel: { variant: "warning" },
  Public: { variant: "info" },
};

const STATUS_BADGE: Record<string, { variant: "success" | "warning" | "info" | "default" }> = {
  actif: { variant: "success" },
  prospect: { variant: "warning" },
  inactif: { variant: "default" },
  devis: { variant: "info" },
};

export default function ClientsClient() {
  const [clients, setClients] = useState<Client[]>([]);
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState<Filter>("Tous");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("Tous");
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [showNewModal, setShowNewModal] = useState(false);
  const [menuOpen, setMenuOpen] = useState<number | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3000);
  };

  // Charge les clients depuis Supabase au montage
  useEffect(() => {
    fetch("/api/clients")
      .then((r) => r.json())
      .then((data) => {
        if (data.clients?.length) setClients(data.clients);
      })
      .catch((err) => { console.error("[ClientsClient] fetch /api/clients:", err); });
  }, []);

  const handleSaveNew = async (client: Client) => {
    // Appel API pour persister en base
    try {
      const res = await fetch("/api/clients", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: client.name,
          type: client.type,
          email: client.email,
          phone: client.phone,
          address: client.address,
          city: client.city,
          siret: client.siret,
          contactName: client.contactName,
          tags: client.tags,
          notes: client.notes?.[0]?.content,
        }),
      });
      const data = await res.json();
      // Si la sauvegarde DB a réussi, utilise le client retourné (avec son vrai UUID)
      if (res.ok && data.client) {
        setClients((prev) => [data.client as Client, ...prev]);
        setSelectedClient(data.client as Client);
        setShowNewModal(false);
        showToast(`Client "${data.client.name}" créé`);
        return;
      }
    } catch {
      // Supabase non configuré — on continue avec le client local
    }
    // Fallback local (sans DB)
    setClients((prev) => [client, ...prev]);
    setShowNewModal(false);
    setSelectedClient(client);
    showToast(`Client "${client.name}" créé`);
  };

  const handleUpdate = (updated: Client) => {
    setClients(clients.map((c) => c.id === updated.id ? updated : c));
    setSelectedClient(updated);
  };

  const handleDelete = (id: number) => {
    setClients(clients.filter((c) => c.id !== id));
    if (selectedClient?.id === id) setSelectedClient(null);
    setMenuOpen(null);
    showToast("Client supprimé");
  };

  // Filtered
  const filtered = clients.filter((c) => {
    const typeMatch = typeFilter === "Tous" ||
      (typeFilter === "Particuliers" && c.type === "Particulier") ||
      (typeFilter === "Professionnels" && c.type === "Professionnel") ||
      (typeFilter === "Public" && c.type === "Public");
    const statusMatch = statusFilter === "Tous" || c.status === statusFilter;
    const searchMatch = !search ||
      c.name.toLowerCase().includes(search.toLowerCase()) ||
      c.email.toLowerCase().includes(search.toLowerCase()) ||
      c.city.toLowerCase().includes(search.toLowerCase());
    return typeMatch && statusMatch && searchMatch;
  });

  // KPIs
  const totalCA = clients.reduce((s, c) => s + c.ca, 0);
  const avgCA = clients.length ? Math.round(totalCA / clients.length) : 0;
  const kpis = [
    { label: "Total clients", value: String(clients.length), icon: Users, color: "text-text-primary", bg: "bg-surface-active" },
    { label: "Actifs", value: String(clients.filter((c) => c.status === "actif").length), icon: TrendingUp, color: "text-primary", bg: "bg-primary/10" },
    { label: "Prospects", value: String(clients.filter((c) => c.status === "prospect").length), icon: UserPlus, color: "text-status-warning", bg: "bg-status-warning/10" },
    { label: "CA moyen / client", value: `${avgCA.toLocaleString("fr-FR")} €`, icon: Star, color: "text-status-info", bg: "bg-status-info/10" },
  ];

  const FILTERS: Filter[] = ["Tous", "Particuliers", "Professionnels", "Public"];
  const STATUS_FILTERS: { id: StatusFilter; label: string }[] = [
    { id: "Tous", label: "Tous statuts" },
    { id: "actif", label: "Actifs" },
    { id: "prospect", label: "Prospects" },
    { id: "devis", label: "Devis en cours" },
    { id: "inactif", label: "Inactifs" },
  ];

  return (
    <>
      {/* Toast */}
      {toast && (
        <div className="fixed bottom-20 md:bottom-6 right-4 md:right-6 z-50 flex items-center gap-3 px-4 py-3 rounded-xl bg-primary/10 border border-primary/30 text-primary shadow-card animate-fade-in">
          <span className="text-sm font-medium">{toast}</span>
        </div>
      )}

      {showNewModal && (
        <NewClientModal onClose={() => setShowNewModal(false)} onSave={handleSaveNew} />
      )}

      {selectedClient && (
        <ClientDrawer
          client={selectedClient}
          onClose={() => setSelectedClient(null)}
          onUpdate={handleUpdate}
        />
      )}

      <div className="space-y-6 animate-fade-in">
        {/* Header */}
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-bold text-text-primary">Clients</h1>
            <p className="text-text-muted mt-1">
              {clients.length} clients •{" "}
              <span className="text-primary font-medium">
                {totalCA.toLocaleString("fr-FR")} € CA cumulé
              </span>
            </p>
          </div>
          <Button variant="primary" icon={Plus} onClick={() => setShowNewModal(true)} className="hidden md:flex">
            Nouveau client
          </Button>
        </div>

        {/* KPIs */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
          {kpis.map((k, i) => (
            <Card key={i} className="py-4">
              <div className={clsx("w-9 h-9 rounded-xl flex items-center justify-center mb-3", k.bg)}>
                <k.icon className={clsx("w-5 h-5", k.color)} />
              </div>
              <p className={clsx("text-2xl font-bold font-mono", k.color)}>{k.value}</p>
              <p className="text-text-muted text-sm mt-1">{k.label}</p>
            </Card>
          ))}
        </div>

        {/* Filters */}
        <Card className="py-3 px-4">
          <div className="flex items-center gap-3 flex-wrap overflow-x-auto">
            {/* Search */}
            <div className="flex-1 min-w-[200px] relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Nom, email, ville…"
                className="input-field w-full pl-9 py-2 text-sm"
              />
            </div>

            {/* Type filter */}
            <div className="flex gap-1">
              {FILTERS.map((f) => (
                <button
                  key={f}
                  onClick={() => setTypeFilter(f)}
                  className={clsx(
                    "px-3 py-1.5 rounded-lg text-xs font-medium transition-colors",
                    typeFilter === f
                      ? "bg-primary text-background"
                      : "text-text-muted hover:text-text-primary hover:bg-surface-hover"
                  )}
                >
                  {f}
                </button>
              ))}
            </div>

            {/* Status filter */}
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as StatusFilter)}
              className="input-field text-xs py-1.5 pr-8"
            >
              {STATUS_FILTERS.map((f) => (
                <option key={f.id} value={f.id}>{f.label}</option>
              ))}
            </select>
          </div>
        </Card>

        {/* Mobile card list */}
        <div className="md:hidden space-y-2">
          {filtered.length === 0 ? (
            <div className="py-12 text-center">
              <Users className="w-10 h-10 mx-auto mb-3 text-text-muted opacity-30" />
              <p className="text-sm text-text-muted">Aucun client trouvé</p>
            </div>
          ) : filtered.map((client) => {
            const initials = client.name.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase();
            return (
              <div
                key={client.id}
                onClick={() => setSelectedClient(client)}
                className="bg-surface border border-surface-border rounded-xl p-4 flex items-center gap-3 cursor-pointer active:bg-surface-hover transition-colors"
              >
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center border border-primary/10 flex-shrink-0">
                  <span className="text-xs font-bold text-primary">{initials}</span>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <p className="text-sm font-semibold text-text-primary truncate">{client.name}</p>
                    <Badge variant={STATUS_BADGE[client.status]?.variant || "default"} size="sm" dot>
                      {client.status}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-3 text-xs text-text-muted">
                    <span className="flex items-center gap-1"><MapPin className="w-3 h-3" />{client.city}</span>
                    <span className="font-mono font-semibold text-text-primary">{client.ca.toLocaleString("fr-FR")} €</span>
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-text-muted flex-shrink-0" />
              </div>
            );
          })}
        </div>

        {/* Desktop Table */}
        <Card className="hidden md:block p-0 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[700px]">
              <thead>
                <tr className="border-b border-surface-border bg-background-secondary/30">
                  {["Client", "Type", "Localisation", "Contact", "CA total", "Chantiers", "Statut", ""].map((h) => (
                    <th key={h} className="text-left px-5 py-3.5 text-xs font-semibold text-text-muted uppercase tracking-wider">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="px-5 py-16 text-center">
                      <Users className="w-10 h-10 mx-auto mb-3 text-text-muted opacity-30" />
                      <p className="text-sm text-text-muted">Aucun client trouvé</p>
                    </td>
                  </tr>
                ) : filtered.map((client) => {
                  const initials = client.name.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase();
                  return (
                    <tr
                      key={client.id}
                      className={clsx(
                        "border-b border-surface-border last:border-0 transition-colors cursor-pointer group",
                        selectedClient?.id === client.id
                          ? "bg-primary/5 hover:bg-primary/8"
                          : "hover:bg-surface-hover/50"
                      )}
                      onClick={() => setSelectedClient(client)}
                    >
                      {/* Name */}
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center border border-primary/10 flex-shrink-0">
                            <span className="text-xs font-bold text-primary">{initials}</span>
                          </div>
                          <div className="min-w-0">
                            <p className="text-sm font-semibold text-text-primary truncate">{client.name}</p>
                            {client.tags && client.tags.length > 0 && (
                              <p className="text-[10px] text-text-muted truncate">
                                {client.tags.slice(0, 2).join(" • ")}
                              </p>
                            )}
                          </div>
                        </div>
                      </td>

                      {/* Type */}
                      <td className="px-5 py-4">
                        <Badge variant={TYPE_BADGE[client.type].variant} size="sm">{client.type}</Badge>
                      </td>

                      {/* Location */}
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-1.5 text-sm text-text-muted">
                          <MapPin className="w-3.5 h-3.5 flex-shrink-0" />
                          <span className="truncate">{client.city}</span>
                        </div>
                      </td>

                      {/* Contact */}
                      <td className="px-5 py-4">
                        <div className="space-y-1">
                          <div className="flex items-center gap-1.5 text-xs text-text-muted">
                            <Phone className="w-3 h-3 flex-shrink-0" />
                            <span>{client.phone}</span>
                          </div>
                          <div className="flex items-center gap-1.5 text-xs text-text-muted">
                            <Mail className="w-3 h-3 flex-shrink-0" />
                            <span className="truncate max-w-[160px]">{client.email}</span>
                          </div>
                        </div>
                      </td>

                      {/* CA */}
                      <td className="px-5 py-4">
                        <span className="text-sm font-semibold font-mono text-text-primary">
                          {client.ca.toLocaleString("fr-FR")} €
                        </span>
                      </td>

                      {/* Chantiers */}
                      <td className="px-5 py-4">
                        <span className="text-sm text-text-secondary">{client.chantiers}</span>
                      </td>

                      {/* Status */}
                      <td className="px-5 py-4">
                        <Badge variant={STATUS_BADGE[client.status]?.variant || "default"} size="sm" dot>
                          {client.status}
                        </Badge>
                      </td>

                      {/* Actions */}
                      <td className="px-5 py-4" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button
                            onClick={() => setSelectedClient(client)}
                            className="p-1.5 rounded-lg text-text-muted hover:text-primary hover:bg-primary/10 transition-colors"
                            title="Ouvrir la fiche"
                          >
                            <ChevronRight className="w-4 h-4" />
                          </button>
                          <div className="relative">
                            <button
                              onClick={() => setMenuOpen(menuOpen === client.id ? null : client.id)}
                              className="p-1.5 rounded-lg text-text-muted hover:text-text-primary hover:bg-surface-active transition-colors"
                            >
                              <MoreHorizontal className="w-4 h-4" />
                            </button>
                            {menuOpen === client.id && (
                              <div className="absolute right-0 top-8 z-10 w-36 bg-surface border border-surface-border rounded-xl shadow-card py-1 animate-fade-in">
                                <button
                                  onClick={() => { setSelectedClient(client); setMenuOpen(null); }}
                                  className="w-full flex items-center gap-2 px-3 py-2 text-xs text-text-secondary hover:bg-surface-hover transition-colors"
                                >
                                  Voir la fiche
                                </button>
                                <button
                                  onClick={() => handleDelete(client.id)}
                                  className="w-full flex items-center gap-2 px-3 py-2 text-xs text-status-error hover:bg-status-error/10 transition-colors"
                                >
                                  Supprimer
                                </button>
                              </div>
                            )}
                          </div>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Footer */}
          <div className="px-5 py-3 border-t border-surface-border flex items-center justify-between text-xs text-text-muted">
            <span>{filtered.length} client(s) affiché(s)</span>
            <span>
              CA total affiché :{" "}
              <span className="font-mono font-semibold text-text-primary">
                {filtered.reduce((s, c) => s + c.ca, 0).toLocaleString("fr-FR")} €
              </span>
            </span>
          </div>
        </Card>
      </div>
      {/* Mobile FAB */}
      <button
        onClick={() => setShowNewModal(true)}
        className="fixed bottom-20 right-4 z-20 md:hidden w-14 h-14 bg-primary rounded-full flex items-center justify-center shadow-lg active:scale-95 transition-transform"
      >
        <Plus className="w-6 h-6 text-background" strokeWidth={2.5} />
      </button>
    </>
  );
}
