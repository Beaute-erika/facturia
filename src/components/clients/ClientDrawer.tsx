"use client";

import { useState } from "react";
import {
  X, Phone, Mail, MapPin, Building2, Hash, User,
  FileText, Receipt, HardHat, StickyNote, Plus,
  TrendingUp, Calendar, Send, ExternalLink,
  CheckCircle2, Clock, AlertTriangle, ChevronRight,
  Pencil, Trash2, Sparkles,
} from "lucide-react";
import { clsx } from "clsx";
import type { Client } from "@/lib/clients-data";
import Badge from "@/components/ui/Badge";
import { useAgent } from "@/components/agent/AgentContext";

interface ClientDrawerProps {
  client: Client;
  onClose: () => void;
  onUpdate: (client: Client) => void;
}

type Tab = "résumé" | "documents" | "chantiers" | "notes";

const DOC_STATUS: Record<string, { variant: "success" | "warning" | "error" | "info" | "default"; label: string }> = {
  payée: { variant: "success", label: "Payée" },
  envoyée: { variant: "info", label: "Envoyée" },
  "en retard": { variant: "error", label: "En retard" },
  brouillon: { variant: "default", label: "Brouillon" },
  accepté: { variant: "success", label: "Accepté" },
  envoyé: { variant: "info", label: "Envoyé" },
  "en attente": { variant: "warning", label: "En attente" },
  refusé: { variant: "error", label: "Refusé" },
};

const CLIENT_STATUS: Record<string, { variant: "success" | "warning" | "info" | "default" }> = {
  actif: { variant: "success" },
  prospect: { variant: "warning" },
  inactif: { variant: "default" },
  devis: { variant: "info" },
};

const TYPE_COLOR: Record<string, string> = {
  Particulier: "from-blue-500/20 to-blue-500/5 border-blue-500/10 text-blue-400",
  Professionnel: "from-amber-500/20 to-amber-500/5 border-amber-500/10 text-amber-400",
  Public: "from-primary/20 to-primary/5 border-primary/10 text-primary",
};

export default function ClientDrawer({ client, onClose, onUpdate }: ClientDrawerProps) {
  const [tab, setTab] = useState<Tab>("résumé");
  const [newNote, setNewNote] = useState("");
  const [addingNote, setAddingNote] = useState(false);
  const { openAgent } = useAgent();
  const clientUuid = (client as Client & { _uuid?: string })._uuid;

  const initials = client.name.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase();

  const handleAddNote = () => {
    if (!newNote.trim()) return;
    const updated: Client = {
      ...client,
      notes: [
        {
          id: `n-${Date.now()}`,
          content: newNote,
          date: new Date().toLocaleDateString("fr-FR", { day: "2-digit", month: "short", year: "numeric" }),
          author: "Jean Dupont",
        },
        ...client.notes,
      ],
    };
    onUpdate(updated);
    setNewNote("");
    setAddingNote(false);
  };

  const handleDeleteNote = (noteId: string) => {
    onUpdate({ ...client, notes: client.notes.filter((n) => n.id !== noteId) });
  };

  const totalDevis = client.documents.filter((d) => d.type === "devis").length;
  const totalFactures = client.documents.filter((d) => d.type === "facture").length;
  const totalPaid = client.documents
    .filter((d) => d.type === "facture" && d.status === "payée")
    .reduce((s, d) => s + (parseFloat(d.montant.replace(/[^0-9]/g, "")) || 0), 0);

  const TABS: { id: Tab; label: string; count?: number }[] = [
    { id: "résumé" as Tab, label: "Résumé" },
    { id: "documents" as Tab, label: "Documents", count: client.documents.length },
    { id: "chantiers" as Tab, label: "Chantiers", count: client.chantiersList.length },
    { id: "notes" as Tab, label: "Notes", count: client.notes.length },
  ];

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-40 bg-black/40 backdrop-blur-[2px]"
        onClick={onClose}
      />

      {/* Drawer */}
      <div className="fixed top-0 right-0 bottom-0 z-50 w-full max-w-lg bg-background-secondary border-l border-surface-border shadow-card flex flex-col animate-slide-in">
        {/* Header */}
        <div className="px-5 py-5 border-b border-surface-border">
          <div className="flex items-start gap-4">
            {/* Avatar */}
            <div className={clsx(
              "w-14 h-14 rounded-2xl flex items-center justify-center border-2 bg-gradient-to-br flex-shrink-0 text-lg font-bold",
              TYPE_COLOR[client.type]
            )}>
              {initials}
            </div>

            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-lg font-bold text-text-primary truncate">{client.name}</h2>
                <Badge variant={CLIENT_STATUS[client.status]?.variant || "default"} size="sm" dot>
                  {client.status}
                </Badge>
              </div>
              <div className="flex items-center gap-2 mt-1 flex-wrap">
                <Badge
                  variant={client.type === "Public" ? "info" : client.type === "Professionnel" ? "warning" : "default"}
                  size="sm"
                >
                  {client.type}
                </Badge>
                {client.tags?.map((tag) => (
                  <span key={tag} className="text-[10px] font-medium text-text-muted bg-surface-active border border-surface-border px-2 py-0.5 rounded-full">
                    {tag}
                  </span>
                ))}
              </div>
              <p className="text-xs text-text-muted mt-1 flex items-center gap-1">
                <MapPin className="w-3 h-3" /> {client.city}
              </p>
            </div>

            <button onClick={onClose} className="p-1.5 rounded-lg text-text-muted hover:text-text-primary hover:bg-surface-hover transition-colors flex-shrink-0">
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Quick actions */}
          <div className="flex gap-2 mt-4">
            <a
              href={`tel:${client.phone}`}
              className="flex-1 flex items-center justify-center gap-2 py-2 rounded-xl bg-surface border border-surface-border text-text-secondary hover:text-primary hover:border-primary/30 hover:bg-primary/5 transition-all text-xs font-medium"
            >
              <Phone className="w-3.5 h-3.5" /> Appeler
            </a>
            <a
              href={`mailto:${client.email}`}
              className="flex-1 flex items-center justify-center gap-2 py-2 rounded-xl bg-surface border border-surface-border text-text-secondary hover:text-status-info hover:border-status-info/30 hover:bg-status-info/5 transition-all text-xs font-medium"
            >
              <Send className="w-3.5 h-3.5" /> Email
            </a>
            <button className="flex-1 flex items-center justify-center gap-2 py-2 rounded-xl bg-primary/10 border border-primary/20 text-primary hover:bg-primary/20 transition-all text-xs font-semibold">
              <FileText className="w-3.5 h-3.5" /> Devis
            </button>
            {clientUuid && (
              <button
                onClick={() => openAgent({ type: "client", id: clientUuid, label: client.name })}
                className="flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-primary/10 border border-primary/20 text-primary hover:bg-primary/20 transition-all text-xs font-semibold"
                title="Demander à l'IA"
              >
                <Sparkles className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-surface-border px-5 gap-0">
          {TABS.map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id as Tab)}
              className={clsx(
                "flex items-center gap-1.5 px-3 py-3 text-sm font-medium border-b-2 transition-colors -mb-px",
                tab === t.id
                  ? "border-primary text-primary"
                  : "border-transparent text-text-muted hover:text-text-primary"
              )}
            >
              {t.label}
              {t.count !== undefined && t.count > 0 && (
                <span className={clsx(
                  "text-[10px] font-bold px-1.5 py-0.5 rounded-full min-w-[18px] text-center",
                  tab === t.id ? "bg-primary/20 text-primary" : "bg-surface-active text-text-muted"
                )}>
                  {t.count}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Tab content */}
        <div className="flex-1 overflow-y-auto">

          {/* ── RÉSUMÉ ── */}
          {tab === "résumé" && (
            <div className="p-5 space-y-5 animate-fade-in">
              {/* KPIs */}
              <div className="grid grid-cols-3 gap-3">
                {[
                  { label: "CA total", value: `${client.ca.toLocaleString("fr-FR")} €`, color: "text-primary" },
                  { label: "Devis", value: String(totalDevis), color: "text-status-info" },
                  { label: "Factures", value: String(totalFactures), color: "text-status-warning" },
                ].map((k, i) => (
                  <div key={i} className="p-3 rounded-xl bg-background border border-surface-border text-center">
                    <p className={clsx("text-xl font-bold font-mono", k.color)}>{k.value}</p>
                    <p className="text-xs text-text-muted mt-0.5">{k.label}</p>
                  </div>
                ))}
              </div>

              {/* Contact info */}
              <div className="space-y-1">
                <p className="text-[10px] font-semibold text-text-muted uppercase tracking-widest mb-2">Coordonnées</p>
                {[
                  { icon: Phone, label: "Téléphone", value: client.phone, href: `tel:${client.phone}` },
                  { icon: Mail, label: "Email", value: client.email, href: `mailto:${client.email}` },
                  { icon: MapPin, label: "Adresse", value: client.address || client.city },
                ].map((row, i) => (
                  <div key={i} className="flex items-center gap-3 p-3 rounded-xl hover:bg-surface-hover transition-colors group">
                    <row.icon className="w-4 h-4 text-text-muted flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-[10px] text-text-muted">{row.label}</p>
                      <p className="text-sm text-text-primary truncate">{row.value}</p>
                    </div>
                    {row.href && (
                      <a href={row.href} className="opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded text-text-muted hover:text-primary">
                        <ExternalLink className="w-3.5 h-3.5" />
                      </a>
                    )}
                  </div>
                ))}
              </div>

              {/* Pro info */}
              {(client.siret || client.contactName || client.tvaNum) && (
                <div className="space-y-1">
                  <p className="text-[10px] font-semibold text-text-muted uppercase tracking-widest mb-2">Informations entreprise</p>
                  {client.contactName && (
                    <div className="flex items-center gap-3 p-3 rounded-xl hover:bg-surface-hover transition-colors">
                      <User className="w-4 h-4 text-text-muted flex-shrink-0" />
                      <div>
                        <p className="text-[10px] text-text-muted">Contact</p>
                        <p className="text-sm text-text-primary">{client.contactName}</p>
                      </div>
                    </div>
                  )}
                  {client.siret && (
                    <div className="flex items-center gap-3 p-3 rounded-xl hover:bg-surface-hover transition-colors">
                      <Hash className="w-4 h-4 text-text-muted flex-shrink-0" />
                      <div>
                        <p className="text-[10px] text-text-muted">SIRET</p>
                        <p className="text-sm font-mono text-text-primary">{client.siret}</p>
                      </div>
                    </div>
                  )}
                  {client.tvaNum && (
                    <div className="flex items-center gap-3 p-3 rounded-xl hover:bg-surface-hover transition-colors">
                      <Building2 className="w-4 h-4 text-text-muted flex-shrink-0" />
                      <div>
                        <p className="text-[10px] text-text-muted">N° TVA intracommunautaire</p>
                        <p className="text-sm font-mono text-text-primary">{client.tvaNum}</p>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Activity */}
              <div className="space-y-1">
                <p className="text-[10px] font-semibold text-text-muted uppercase tracking-widest mb-2">Activité</p>
                {[
                  { icon: Calendar, label: "Client depuis", value: client.createdAt },
                  { icon: TrendingUp, label: "Dernière activité", value: client.lastActivity },
                  { icon: CheckCircle2, label: "Payé total", value: `${totalPaid.toLocaleString("fr-FR")} €` },
                ].map((row, i) => (
                  <div key={i} className="flex items-center gap-3 p-3 rounded-xl">
                    <row.icon className="w-4 h-4 text-text-muted flex-shrink-0" />
                    <div className="flex-1">
                      <p className="text-[10px] text-text-muted">{row.label}</p>
                      <p className="text-sm text-text-primary">{row.value}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ── DOCUMENTS ── */}
          {tab === "documents" && (
            <div className="p-5 space-y-3 animate-fade-in">
              <div className="flex items-center justify-between mb-1">
                <p className="text-sm font-semibold text-text-primary">Devis & Factures</p>
                <button className="flex items-center gap-1.5 text-xs text-primary hover:text-primary-400 transition-colors font-semibold">
                  <Plus className="w-3.5 h-3.5" /> Nouveau devis
                </button>
              </div>

              {client.documents.length === 0 ? (
                <div className="py-12 text-center">
                  <FileText className="w-10 h-10 mx-auto mb-3 text-text-muted opacity-30" />
                  <p className="text-sm text-text-muted">Aucun document pour ce client</p>
                  <button className="mt-3 btn-primary text-sm px-4 py-2">Créer un devis</button>
                </div>
              ) : (
                client.documents.map((doc) => {
                  const sc = DOC_STATUS[doc.status] || { variant: "default" as const, label: doc.status };
                  return (
                    <div key={doc.id} className="flex items-center gap-3 p-3.5 rounded-xl bg-background border border-surface-border hover:border-primary/20 transition-colors cursor-pointer group">
                      <div className={clsx(
                        "w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0",
                        doc.type === "facture" ? "bg-primary/10" : "bg-status-info/10"
                      )}>
                        {doc.type === "facture"
                          ? <Receipt className="w-4 h-4 text-primary" />
                          : <FileText className="w-4 h-4 text-status-info" />
                        }
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-xs font-semibold text-text-muted">{doc.id}</span>
                          <Badge variant={sc.variant} size="sm">{sc.label}</Badge>
                        </div>
                        <p className="text-sm font-medium text-text-primary truncate">{doc.objet}</p>
                        <p className="text-xs text-text-muted">{doc.date}</p>
                      </div>
                      <div className="text-right flex-shrink-0">
                        <p className="text-sm font-bold font-mono text-text-primary">{doc.montant}</p>
                        <ChevronRight className="w-4 h-4 text-text-muted ml-auto opacity-0 group-hover:opacity-100 transition-opacity" />
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          )}

          {/* ── CHANTIERS ── */}
          {tab === "chantiers" && (
            <div className="p-5 space-y-3 animate-fade-in">
              <div className="flex items-center justify-between mb-1">
                <p className="text-sm font-semibold text-text-primary">Chantiers</p>
                <button className="flex items-center gap-1.5 text-xs text-primary hover:text-primary-400 transition-colors font-semibold">
                  <Plus className="w-3.5 h-3.5" /> Nouveau chantier
                </button>
              </div>

              {client.chantiersList.length === 0 ? (
                <div className="py-12 text-center">
                  <HardHat className="w-10 h-10 mx-auto mb-3 text-text-muted opacity-30" />
                  <p className="text-sm text-text-muted">Aucun chantier pour ce client</p>
                </div>
              ) : (
                client.chantiersList.map((ch) => {
                  const statusConf = {
                    "en cours": { variant: "info" as const, label: "En cours", icon: Clock },
                    "terminé": { variant: "success" as const, label: "Terminé", icon: CheckCircle2 },
                    "planifié": { variant: "warning" as const, label: "Planifié", icon: AlertTriangle },
                  }[ch.status];
                  return (
                    <div key={ch.id} className="p-4 rounded-xl bg-background border border-surface-border hover:border-primary/20 transition-colors cursor-pointer">
                      <div className="flex items-start justify-between mb-3">
                        <div>
                          <div className="flex items-center gap-2 mb-1">
                            <span className="font-mono text-xs text-text-muted">{ch.id}</span>
                            <Badge variant={statusConf.variant} size="sm" dot>{statusConf.label}</Badge>
                          </div>
                          <p className="text-sm font-semibold text-text-primary">{ch.objet}</p>
                          <p className="text-xs text-text-muted mt-0.5 flex items-center gap-1">
                            <Calendar className="w-3 h-3" /> {ch.date}
                          </p>
                        </div>
                        <span className="text-sm font-bold font-mono text-text-primary">{ch.montant}</span>
                      </div>
                      <div>
                        <div className="flex justify-between text-xs mb-1">
                          <span className="text-text-muted">Avancement</span>
                          <span className="font-semibold text-text-primary">{ch.progression}%</span>
                        </div>
                        <div className="h-1.5 bg-surface-active rounded-full overflow-hidden">
                          <div
                            className="h-full bg-primary rounded-full"
                            style={{ width: `${ch.progression}%` }}
                          />
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          )}

          {/* ── NOTES ── */}
          {tab === "notes" && (
            <div className="p-5 space-y-3 animate-fade-in">
              <div className="flex items-center justify-between mb-1">
                <p className="text-sm font-semibold text-text-primary">Notes internes</p>
                <button
                  onClick={() => setAddingNote(true)}
                  className="flex items-center gap-1.5 text-xs text-primary hover:text-primary-400 transition-colors font-semibold"
                >
                  <Plus className="w-3.5 h-3.5" /> Ajouter
                </button>
              </div>

              {/* New note input */}
              {addingNote && (
                <div className="p-3 rounded-xl bg-primary/5 border border-primary/20 animate-fade-in">
                  <textarea
                    value={newNote}
                    onChange={(e) => setNewNote(e.target.value)}
                    placeholder="Saisissez votre note…"
                    rows={3}
                    className="input-field w-full text-sm resize-none mb-2"
                    autoFocus
                  />
                  <div className="flex gap-2">
                    <button onClick={() => { setAddingNote(false); setNewNote(""); }} className="btn-ghost text-xs px-3 py-1.5 rounded-lg border border-surface-border">
                      Annuler
                    </button>
                    <button onClick={handleAddNote} disabled={!newNote.trim()} className="btn-primary text-xs px-3 py-1.5 disabled:opacity-50">
                      Enregistrer
                    </button>
                  </div>
                </div>
              )}

              {client.notes.length === 0 && !addingNote ? (
                <div className="py-12 text-center">
                  <StickyNote className="w-10 h-10 mx-auto mb-3 text-text-muted opacity-30" />
                  <p className="text-sm text-text-muted">Aucune note pour ce client</p>
                  <button onClick={() => setAddingNote(true)} className="mt-3 btn-primary text-sm px-4 py-2">
                    Ajouter une note
                  </button>
                </div>
              ) : (
                client.notes.map((note) => (
                  <div key={note.id} className="p-4 rounded-xl bg-background border border-surface-border group hover:border-surface-active transition-colors">
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center">
                          <span className="text-[9px] font-bold text-primary">JD</span>
                        </div>
                        <span className="text-xs font-semibold text-text-secondary">{note.author}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <span className="text-xs text-text-muted">{note.date}</span>
                        <button
                          onClick={() => handleDeleteNote(note.id)}
                          className="opacity-0 group-hover:opacity-100 p-1 rounded text-text-muted hover:text-status-error transition-all"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                    <p className="text-sm text-text-secondary leading-relaxed">{note.content}</p>
                  </div>
                ))
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-3 border-t border-surface-border flex items-center justify-between">
          <button className="flex items-center gap-1.5 text-xs text-text-muted hover:text-status-error hover:bg-status-error/10 px-3 py-1.5 rounded-lg transition-colors">
            <Trash2 className="w-3.5 h-3.5" /> Supprimer
          </button>
          <button className="flex items-center gap-1.5 text-xs text-primary bg-primary/10 hover:bg-primary/20 px-3 py-1.5 rounded-lg font-semibold transition-colors">
            <Pencil className="w-3.5 h-3.5" /> Modifier
          </button>
        </div>
      </div>
    </>
  );
}
