"use client";

import { useState, useEffect } from "react";
import {
  Plus,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Send,
  Download,
  Eye,
  Search,
  MoreHorizontal,
  Bell,
  Building2,
  Trash2,
  Receipt,
} from "lucide-react";
import { clsx } from "clsx";
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import Badge from "@/components/ui/Badge";
import SendEmailModal from "./SendEmailModal";
import FacturePreviewModal from "./FacturePreviewModal";
import { generateFacturePDF, buildFactureDataFromRow, type FactureData } from "@/lib/pdf-facture";
import { createBrowserClient } from "@/lib/supabase-client";

type FactureStatus = "payée" | "envoyée" | "en retard" | "brouillon";

interface Facture {
  id: string;
  client: string;
  objet: string;
  montant: string;
  tva: string;
  total: string;
  date: string;
  echeance: string;
  status: FactureStatus;
  chorus: boolean;
}


const STATUS_CONFIG: Record<FactureStatus, { variant: "success" | "warning" | "error" | "info" | "default"; label: string }> = {
  payée: { variant: "success", label: "Payée" },
  envoyée: { variant: "info", label: "Envoyée" },
  "en retard": { variant: "error", label: "En retard" },
  brouillon: { variant: "default", label: "Brouillon" },
};

type Filter = "Toutes" | "Brouillons" | "Envoyées" | "Payées" | "En retard";
const FILTERS: Filter[] = ["Toutes", "Brouillons", "Envoyées", "Payées", "En retard"];
const FILTER_MAP: Record<Filter, FactureStatus | null> = {
  Toutes: null,
  Brouillons: "brouillon",
  Envoyées: "envoyée",
  Payées: "payée",
  "En retard": "en retard",
};

export default function FacturesClient() {
  const [factures, setFactures] = useState<Facture[]>([]);
  const [artisan, setArtisan] = useState<Partial<FactureData["artisan"]>>({});
  const [filter, setFilter] = useState<Filter>("Toutes");
  const [search, setSearch] = useState("");
  const [menuOpen, setMenuOpen] = useState<string | null>(null);
  const [emailTarget, setEmailTarget] = useState<Facture | null>(null);
  const [previewTarget, setPreviewTarget] = useState<Facture | null>(null);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);
  const [toast, setToast] = useState<{ msg: string; type: "success" | "info" | "warning" } | null>(null);

  // Charge les factures depuis Supabase
  useEffect(() => {
    fetch("/api/factures")
      .then((r) => r.json())
      .then((data) => { if (data.factures) setFactures(data.factures); })
      .catch((err) => { console.error("[FacturesClient] fetch /api/factures:", err); });
  }, []);

  // Charge le profil artisan pour les PDFs
  useEffect(() => {
    const supabase = createBrowserClient();
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) return;
      supabase.from("users").select("prenom,nom,raison_sociale,adresse,ville,code_postal,siret,email,tel,logo_url").eq("id", user.id).single().then(({ data }) => {
        if (!data) return;
        const nom = data.raison_sociale || [data.prenom, data.nom].filter(Boolean).join(" ");
        const adresse = [data.adresse, [data.code_postal, data.ville].filter(Boolean).join(" ")].filter(Boolean).join(", ");
        setArtisan({ nom, adresse, siret: data.siret || "", email: data.email || user.email || "", tel: data.tel || "", logo_url: data.logo_url ?? null });
      });
    }).catch((err) => { console.error("[FacturesClient] fetch artisan profile:", err); });
  }, []);

  const showToast = (msg: string, type: "success" | "info" | "warning" = "success") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3200);
  };

  const handleDownload = async (f: Facture) => {
    setDownloadingId(f.id);
    await generateFacturePDF(buildFactureDataFromRow(f, artisan));
    setDownloadingId(null);
    showToast(`PDF ${f.id} téléchargé`, "info");
  };

  const handleMarkPaid = (id: string) => {
    setFactures((prev) => prev.map((f) => f.id === id ? { ...f, status: "payée" as FactureStatus } : f));
    setPreviewTarget(null);
    setMenuOpen(null);
    showToast("Facture marquée comme payée ✓");
  };

  const handleRelance = (f: Facture) => {
    setEmailTarget({
      ...f,
      objet: `[RELANCE] ${f.objet}`,
    });
    setMenuOpen(null);
    showToast(`Relance préparée pour ${f.client}`, "warning");
  };

  const handleDelete = (id: string) => {
    setFactures((prev) => prev.filter((f) => f.id !== id));
    setMenuOpen(null);
    showToast("Facture supprimée", "info");
  };

  const handleSend = (f: Facture) => {
    setFactures((prev) => prev.map((x) => x.id === f.id ? { ...x, status: "envoyée" as FactureStatus } : x));
    showToast(`Facture ${f.id} envoyée à ${f.client}`);
  };

  // KPI calculations
  const totalPayees = factures
    .filter((f) => f.status === "payée")
    .reduce((s, f) => s + (parseFloat(f.total.replace(/[^0-9]/g, "")) || 0), 0);
  const totalAttente = factures
    .filter((f) => f.status === "envoyée")
    .reduce((s, f) => s + (parseFloat(f.total.replace(/[^0-9]/g, "")) || 0), 0);
  const totalRetard = factures
    .filter((f) => f.status === "en retard")
    .reduce((s, f) => s + (parseFloat(f.total.replace(/[^0-9]/g, "")) || 0), 0);
  const chorusCount = factures.filter((f) => f.chorus && f.status !== "payée").length;

  const filtered = factures.filter((f) => {
    const statusMatch = FILTER_MAP[filter] === null || f.status === FILTER_MAP[filter];
    const searchMatch =
      !search ||
      f.client.toLowerCase().includes(search.toLowerCase()) ||
      f.objet.toLowerCase().includes(search.toLowerCase()) ||
      f.id.toLowerCase().includes(search.toLowerCase());
    return statusMatch && searchMatch;
  });

  const toastColors = {
    success: "bg-primary/10 border-primary/30 text-primary",
    info: "bg-status-info/10 border-status-info/30 text-status-info",
    warning: "bg-status-warning/10 border-status-warning/30 text-status-warning",
  };

  return (
    <>
      {/* Toast */}
      {toast && (
        <div className={clsx(
          "fixed bottom-20 md:bottom-6 right-4 md:right-6 z-50 flex items-center gap-3 px-4 py-3 rounded-xl shadow-card border animate-fade-in",
          toastColors[toast.type]
        )}>
          <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
          <span className="text-sm font-medium">{toast.msg}</span>
        </div>
      )}

      {/* Modals */}
      {emailTarget && (
        <SendEmailModal
          facture={emailTarget}
          onClose={() => setEmailTarget(null)}
          onSent={() => handleSend(emailTarget)}
        />
      )}
      {previewTarget && (
        <FacturePreviewModal
          facture={previewTarget}
          onClose={() => setPreviewTarget(null)}
          onDownload={() => handleDownload(previewTarget)}
          onSendEmail={() => { setPreviewTarget(null); setEmailTarget(previewTarget); }}
          onMarkPaid={() => handleMarkPaid(previewTarget.id)}
        />
      )}

      <div className="space-y-6 animate-fade-in">
        {/* Header */}
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-bold text-text-primary">Factures</h1>
            <p className="text-text-muted mt-1">
              {totalAttente.toLocaleString("fr-FR")} € en attente
              {totalRetard > 0 && (
                <> • <span className="text-status-error font-medium">
                  {totalRetard.toLocaleString("fr-FR")} € en retard
                </span></>
              )}
            </p>
          </div>
          <div className="hidden md:flex gap-2">
            <Button variant="secondary" icon={Building2} size="sm">
              Chorus Pro
            </Button>
            <Button variant="primary" icon={Plus}>
              Nouvelle facture
            </Button>
          </div>
        </div>

        {/* KPIs */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
          {[
            { label: "Payées (mois)", value: `${totalPayees.toLocaleString("fr-FR")} €`, icon: CheckCircle2, color: "text-primary", bg: "bg-primary/10" },
            { label: "En attente", value: `${totalAttente.toLocaleString("fr-FR")} €`, icon: Clock, color: "text-status-warning", bg: "bg-status-warning/10" },
            { label: "En retard", value: totalRetard > 0 ? `${totalRetard.toLocaleString("fr-FR")} €` : "—", icon: AlertTriangle, color: totalRetard > 0 ? "text-status-error" : "text-text-muted", bg: totalRetard > 0 ? "bg-status-error/10" : "bg-surface-active" },
            { label: "Chorus Pro", value: `${chorusCount} à déposer`, icon: Building2, color: "text-status-info", bg: "bg-status-info/10" },
          ].map((s, i) => (
            <Card key={i} className="py-4">
              <div className={clsx("w-9 h-9 rounded-xl flex items-center justify-center mb-3", s.bg)}>
                <s.icon className={clsx("w-5 h-5", s.color)} />
              </div>
              <p className={clsx("text-xl font-bold font-mono", s.color)}>{s.value}</p>
              <p className="text-text-muted text-sm mt-1">{s.label}</p>
            </Card>
          ))}
        </div>

        {/* En retard banner */}
        {factures.some((f) => f.status === "en retard") && (
          <div className="flex items-center gap-3 p-4 rounded-xl bg-status-error/5 border border-status-error/20">
            <AlertTriangle className="w-4 h-4 text-status-error flex-shrink-0" />
            <p className="text-sm text-status-error flex-1">
              <strong>{factures.filter((f) => f.status === "en retard").length} facture(s) en retard</strong> — Envoyez une relance depuis la colonne Actions.
            </p>
            <Button
              variant="danger"
              icon={Bell}
              size="sm"
              onClick={() => {
                const f = factures.find((f) => f.status === "en retard");
                if (f) handleRelance(f);
              }}
            >
              Relancer
            </Button>
          </div>
        )}

        {/* Mobile card list */}
        <div className="md:hidden space-y-2">
          {filtered.length === 0 ? (
            <div className="py-12 text-center">
              <Receipt className="w-10 h-10 mx-auto mb-3 text-text-muted opacity-30" />
              <p className="text-sm text-text-muted">Aucune facture trouvée</p>
            </div>
          ) : filtered.map((f) => {
            const sc = STATUS_CONFIG[f.status];
            return (
              <div
                key={f.id}
                onClick={() => setPreviewTarget(f)}
                className="bg-surface border border-surface-border rounded-xl p-4 cursor-pointer active:bg-surface-hover transition-colors"
              >
                <div className="flex items-start justify-between mb-2">
                  <div className="min-w-0 flex-1 pr-3">
                    <p className="font-mono text-sm font-semibold text-primary">{f.id}</p>
                    <p className="text-sm font-semibold text-text-primary mt-0.5">{f.client}</p>
                    <p className="text-xs text-text-muted mt-0.5 line-clamp-1">{f.objet}</p>
                  </div>
                  <div className="flex flex-col items-end gap-1.5 flex-shrink-0">
                    <Badge variant={sc.variant} size="sm" dot>{sc.label}</Badge>
                    <span className="font-mono text-sm font-bold text-text-primary">{f.total}</span>
                  </div>
                </div>
                <div className="flex items-center justify-between pt-2 border-t border-surface-border">
                  <span className={clsx(
                    "text-xs",
                    f.status === "en retard" ? "text-status-error font-semibold" : "text-text-muted"
                  )}>
                    Échéance : {f.echeance}
                  </span>
                  <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                    {(f.status === "envoyée" || f.status === "en retard") && (
                      <button
                        onClick={() => handleMarkPaid(f.id)}
                        className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-primary bg-primary/10 text-xs font-semibold"
                      >
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        Payée
                      </button>
                    )}
                    <button
                      onClick={() => handleDownload(f)}
                      className="p-1.5 rounded-lg text-text-muted hover:bg-surface-active"
                    >
                      <Download className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Desktop Table */}
        <Card className="hidden md:block p-0 overflow-hidden">
          {/* Toolbar */}
          <div className="px-5 py-4 border-b border-surface-border flex items-center gap-3 flex-wrap">
            <div className="relative flex-1 max-w-xs">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-text-muted" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Rechercher…"
                className="input-field w-full pl-8 py-1.5 text-sm"
              />
            </div>
            <div className="flex gap-1 ml-auto flex-wrap">
              {FILTERS.map((f) => (
                <button
                  key={f}
                  onClick={() => setFilter(f)}
                  className={clsx(
                    "px-3 py-1 rounded-lg text-xs font-medium transition-colors",
                    filter === f
                      ? "bg-primary/10 text-primary"
                      : "text-text-muted hover:text-text-primary hover:bg-surface-hover"
                  )}
                >
                  {f}
                  {f === "En retard" && factures.some((x) => x.status === "en retard") && (
                    <span className="ml-1.5 w-1.5 h-1.5 bg-status-error rounded-full inline-block" />
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* Table */}
          {filtered.length === 0 ? (
            <div className="py-16 text-center">
              <Receipt className="w-10 h-10 mx-auto mb-3 text-text-muted opacity-30" />
              <p className="text-sm text-text-muted">Aucune facture trouvée</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[860px]">
                <thead>
                  <tr className="border-b border-surface-border bg-background-secondary/30">
                    {["N° Facture", "Client", "Objet", "HT", "TTC", "Date", "Échéance", "Statut", "Chorus", "Actions"].map((h) => (
                      <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-text-muted uppercase tracking-wider whitespace-nowrap">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((f) => {
                    const sc = STATUS_CONFIG[f.status];
                    return (
                      <tr
                        key={f.id}
                        className="border-b border-surface-border last:border-0 hover:bg-surface-hover/50 transition-colors group"
                      >
                        <td className="px-4 py-4 font-mono text-sm text-primary font-semibold">{f.id}</td>
                        <td className="px-4 py-4 text-sm font-medium text-text-primary whitespace-nowrap">{f.client}</td>
                        <td className="px-4 py-4 text-sm text-text-secondary max-w-[160px] truncate">{f.objet}</td>
                        <td className="px-4 py-4 text-sm font-mono text-text-secondary whitespace-nowrap">{f.montant}</td>
                        <td className="px-4 py-4 text-sm font-semibold font-mono text-text-primary whitespace-nowrap">{f.total}</td>
                        <td className="px-4 py-4 text-sm text-text-muted whitespace-nowrap">{f.date}</td>
                        <td className={clsx(
                          "px-4 py-4 text-sm whitespace-nowrap",
                          f.status === "en retard" ? "text-status-error font-semibold" : "text-text-muted"
                        )}>
                          {f.echeance}
                        </td>
                        <td className="px-4 py-4">
                          <Badge variant={sc.variant} size="sm" dot>{sc.label}</Badge>
                        </td>
                        <td className="px-4 py-4">
                          {f.chorus ? (
                            <Badge variant="success" size="sm">✓ Déposé</Badge>
                          ) : (
                            <span className="text-text-muted text-sm">—</span>
                          )}
                        </td>
                        <td className="px-4 py-4">
                          <div className="flex items-center gap-1">
                            {/* Preview */}
                            <button
                              title="Aperçu"
                              onClick={() => setPreviewTarget(f)}
                              className="p-1.5 rounded-lg text-text-muted hover:text-text-primary hover:bg-surface-active transition-colors"
                            >
                              <Eye className="w-4 h-4" />
                            </button>

                            {/* Download PDF */}
                            <button
                              title="Télécharger PDF"
                              onClick={() => handleDownload(f)}
                              disabled={downloadingId === f.id}
                              className="p-1.5 rounded-lg text-text-muted hover:text-text-primary hover:bg-surface-active transition-colors"
                            >
                              {downloadingId === f.id ? (
                                <div className="w-4 h-4 border-2 border-text-muted border-t-transparent rounded-full animate-spin" />
                              ) : (
                                <Download className="w-4 h-4" />
                              )}
                            </button>

                            {/* Send email */}
                            {f.status !== "payée" && (
                              <button
                                title="Envoyer par email"
                                onClick={() => setEmailTarget(f)}
                                className="p-1.5 rounded-lg text-text-muted hover:text-status-info hover:bg-status-info/10 transition-colors"
                              >
                                <Send className="w-4 h-4" />
                              </button>
                            )}

                            {/* Mark paid */}
                            {(f.status === "envoyée" || f.status === "en retard") && (
                              <button
                                title="Marquer payée"
                                onClick={() => handleMarkPaid(f.id)}
                                className="p-1.5 rounded-lg text-text-muted hover:text-primary hover:bg-primary/10 transition-colors"
                              >
                                <CheckCircle2 className="w-4 h-4" />
                              </button>
                            )}

                            {/* More menu */}
                            <div className="relative">
                              <button
                                onClick={() => setMenuOpen(menuOpen === f.id ? null : f.id)}
                                className="p-1.5 rounded-lg text-text-muted hover:text-text-primary hover:bg-surface-active transition-colors"
                              >
                                <MoreHorizontal className="w-4 h-4" />
                              </button>
                              {menuOpen === f.id && (
                                <div className="absolute right-0 top-8 z-10 w-40 bg-surface border border-surface-border rounded-xl shadow-card py-1 animate-fade-in">
                                  {f.status === "en retard" && (
                                    <button
                                      onClick={() => handleRelance(f)}
                                      className="w-full flex items-center gap-2 px-3 py-2 text-xs text-status-warning hover:bg-status-warning/10 transition-colors"
                                    >
                                      <Bell className="w-3.5 h-3.5" />
                                      Envoyer relance
                                    </button>
                                  )}
                                  <button
                                    onClick={() => handleDelete(f.id)}
                                    className="w-full flex items-center gap-2 px-3 py-2 text-xs text-status-error hover:bg-status-error/10 transition-colors"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
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
          )}

          {/* Footer */}
          <div className="px-5 py-3 border-t border-surface-border flex items-center justify-between text-xs text-text-muted">
            <span>{filtered.length} facture(s) affichée(s)</span>
            <span>
              Total affiché :{" "}
              <span className="font-mono font-semibold text-text-primary">
                {filtered.reduce((s, f) => s + (parseFloat(f.total.replace(/[^0-9]/g, "")) || 0), 0).toLocaleString("fr-FR")} € TTC
              </span>
            </span>
          </div>
        </Card>
      </div>

      {/* Mobile FAB */}
      <button
        className="fixed bottom-20 right-4 z-20 md:hidden w-14 h-14 bg-primary rounded-full flex items-center justify-center shadow-lg active:scale-95 transition-transform"
      >
        <Plus className="w-6 h-6 text-background" strokeWidth={2.5} />
      </button>
    </>
  );
}
