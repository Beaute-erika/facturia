"use client";

import { useState, useEffect } from "react";
import {
  Plus,
  Euro,
  Clock,
  CheckCircle,
  XCircle,
  Eye,
  Download,
  Receipt,
  Sparkles,
  Search,
  MoreHorizontal,
  FileCheck,
  Trash2,
  Send,
} from "lucide-react";
import { clsx } from "clsx";
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import Badge from "@/components/ui/Badge";
import AIGenerateModal, { type GeneratedDevis } from "./AIGenerateModal";
import ConvertToFactureModal from "./ConvertToFactureModal";
import NewDevisModal, { type NewDevisResult } from "./NewDevisModal";
import { generateDevisPDF, buildDevisDataFromRow, type DevisData } from "@/lib/pdf";
import { createBrowserClient } from "@/lib/supabase-client";

type DevisStatus = "accepté" | "envoyé" | "en attente" | "brouillon" | "refusé";

interface Devis {
  id: string;
  client: string;
  objet: string;
  montant: string;
  date: string;
  validite: string;
  status: DevisStatus;
}


const STATUS_CONFIG: Record<DevisStatus, { variant: "success" | "warning" | "error" | "info" | "default"; label: string }> = {
  accepté: { variant: "success", label: "Accepté" },
  envoyé: { variant: "info", label: "Envoyé" },
  "en attente": { variant: "warning", label: "En attente" },
  brouillon: { variant: "default", label: "Brouillon" },
  refusé: { variant: "error", label: "Refusé" },
};

type Filter = "Tous" | "Brouillons" | "Envoyés" | "Acceptés" | "Refusés";
const FILTERS: Filter[] = ["Tous", "Brouillons", "Envoyés", "Acceptés", "Refusés"];
const FILTER_MAP: Record<Filter, DevisStatus | null> = {
  Tous: null,
  Brouillons: "brouillon",
  Envoyés: "envoyé",
  Acceptés: "accepté",
  Refusés: "refusé",
};

export default function DevisClient() {
  const [devis, setDevis] = useState<Devis[]>([]);
  const [artisan, setArtisan] = useState<Partial<DevisData["artisan"]>>({});
  const [filter, setFilter] = useState<Filter>("Tous");
  const [search, setSearch] = useState("");
  const [aiOpen, setAiOpen] = useState(false);
  const [newDevisOpen, setNewDevisOpen] = useState(false);
  const [convertTarget, setConvertTarget] = useState<Devis | null>(null);
  const [menuOpen, setMenuOpen] = useState<string | null>(null);
  const [toast, setToast] = useState<{ msg: string; type: "success" | "info" } | null>(null);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);

  // Charge les devis depuis Supabase
  useEffect(() => {
    fetch("/api/devis")
      .then((r) => r.json())
      .then((data) => { if (data.devis) setDevis(data.devis); })
      .catch((err) => { console.error("[DevisClient] fetch /api/devis:", err); });
  }, []);

  // Charge le profil artisan pour le PDF
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
    }).catch((err) => { console.error("[DevisClient] fetch artisan profile:", err); });
  }, []);

  const showToast = (msg: string, type: "success" | "info" = "success") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  };

  // Add manually-created devis
  const handleNewDevis = (result: NewDevisResult) => {
    setDevis([result, ...devis]);
    setNewDevisOpen(false);
    showToast(`Devis ${result.id} créé`);
  };

  // Add AI-generated devis
  const handleGenerated = (generated: GeneratedDevis) => {
    const newDevis: Devis = {
      id: generated.id,
      client: generated.client,
      objet: generated.objet,
      montant: generated.montant,
      date: generated.date,
      validite: generated.validite,
      status: "brouillon",
    };
    setDevis([newDevis, ...devis]);
    setAiOpen(false);
    showToast(`Devis ${generated.id} créé par l'IA`);
  };

  // Convert devis → facture
  const handleConvert = (factureId: string) => {
    if (!convertTarget) return;
    setDevis(devis.map((d) =>
      d.id === convertTarget.id ? { ...d, status: "accepté" } : d
    ));
    setConvertTarget(null);
    showToast(`Facture ${factureId} créée avec succès`);
  };

  // Download PDF
  const handleDownload = async (d: Devis) => {
    if (!artisan.nom) {
      showToast("Profil artisan en cours de chargement, réessayez dans un instant", "info");
      return;
    }
    setDownloadingId(d.id);
    await generateDevisPDF(buildDevisDataFromRow(d, artisan));
    setDownloadingId(null);
    showToast(`PDF ${d.id} téléchargé`, "info");
  };

  // Delete devis
  const handleDelete = (id: string) => {
    setDevis(devis.filter((d) => d.id !== id));
    setMenuOpen(null);
    showToast("Devis supprimé", "info");
  };

  // Filtered list
  const filtered = devis.filter((d) => {
    const statusMatch = FILTER_MAP[filter] === null || d.status === FILTER_MAP[filter];
    const searchMatch =
      !search ||
      d.client.toLowerCase().includes(search.toLowerCase()) ||
      d.objet.toLowerCase().includes(search.toLowerCase()) ||
      d.id.toLowerCase().includes(search.toLowerCase());
    return statusMatch && searchMatch;
  });

  const totalEnCours = devis
    .filter((d) => d.status !== "refusé")
    .reduce((s, d) => s + (parseFloat(d.montant.replace(/[^0-9]/g, "")) || 0), 0);

  return (
    <>
      {/* Toast */}
      {toast && (
        <div className={clsx(
          "fixed bottom-20 md:bottom-6 right-4 md:right-6 z-50 flex items-center gap-3 px-4 py-3 rounded-xl shadow-card border animate-fade-in",
          toast.type === "success"
            ? "bg-primary/10 border-primary/30 text-primary"
            : "bg-status-info/10 border-status-info/30 text-status-info"
        )}>
          <CheckCircle className="w-4 h-4 flex-shrink-0" />
          <span className="text-sm font-medium">{toast.msg}</span>
        </div>
      )}

      {/* Modals */}
      {newDevisOpen && (
        <NewDevisModal onClose={() => setNewDevisOpen(false)} onCreated={handleNewDevis} />
      )}
      {aiOpen && (
        <AIGenerateModal onClose={() => setAiOpen(false)} onGenerated={handleGenerated} />
      )}
      {convertTarget && (
        <ConvertToFactureModal
          devis={convertTarget}
          onClose={() => setConvertTarget(null)}
          onConfirm={handleConvert}
        />
      )}

      <div className="space-y-6 animate-fade-in">
        {/* Header */}
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-bold text-text-primary">Devis</h1>
            <p className="text-text-muted mt-1">
              {devis.length} devis •{" "}
              <span className="text-primary font-medium">{totalEnCours.toLocaleString("fr-FR")} € en cours</span>
            </p>
          </div>
          <div className="hidden md:flex gap-2">
            <Button
              variant="secondary"
              icon={Sparkles}
              onClick={() => setAiOpen(true)}
              className="border-primary/30 text-primary hover:bg-primary/10"
            >
              Générer avec IA
            </Button>
            <Button variant="primary" icon={Plus} onClick={() => setNewDevisOpen(true)}>
              Nouveau devis
            </Button>
          </div>
        </div>

        {/* KPIs */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
          {[
            {
              label: "En attente",
              value: String(devis.filter((d) => d.status === "en attente" || d.status === "envoyé").length),
              icon: Clock,
              color: "text-status-warning",
              bg: "bg-status-warning/10",
            },
            {
              label: "Acceptés (mois)",
              value: String(devis.filter((d) => d.status === "accepté").length),
              icon: CheckCircle,
              color: "text-primary",
              bg: "bg-primary/10",
            },
            {
              label: "Refusés (mois)",
              value: String(devis.filter((d) => d.status === "refusé").length),
              icon: XCircle,
              color: "text-status-error",
              bg: "bg-status-error/10",
            },
            {
              label: "Taux de conversion",
              value: `${Math.round((devis.filter((d) => d.status === "accepté").length / Math.max(devis.length, 1)) * 100)}%`,
              icon: Euro,
              color: "text-status-info",
              bg: "bg-status-info/10",
            },
          ].map((s, i) => (
            <Card key={i} className="py-4">
              <div className={clsx("w-9 h-9 rounded-xl flex items-center justify-center mb-3", s.bg)}>
                <s.icon className={clsx("w-5 h-5", s.color)} />
              </div>
              <p className={clsx("text-2xl font-bold font-mono", s.color)}>{s.value}</p>
              <p className="text-text-muted text-sm mt-1">{s.label}</p>
            </Card>
          ))}
        </div>

        {/* Mobile card list */}
        <div className="md:hidden space-y-2">
          {filtered.length === 0 ? (
            <div className="py-12 text-center text-text-muted">
              <FileCheck className="w-10 h-10 mx-auto mb-3 opacity-30" />
              <p className="text-sm">Aucun devis trouvé</p>
            </div>
          ) : filtered.map((d) => {
            const sc = STATUS_CONFIG[d.status];
            const canConvert = d.status === "accepté" || d.status === "envoyé";
            return (
              <div key={d.id} className="bg-surface border border-surface-border rounded-xl p-4">
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <p className="font-mono text-sm font-semibold text-primary">{d.id}</p>
                    <p className="text-sm font-semibold text-text-primary mt-0.5">{d.client}</p>
                    <p className="text-xs text-text-muted mt-0.5 line-clamp-1">{d.objet}</p>
                  </div>
                  <div className="flex flex-col items-end gap-1.5">
                    <Badge variant={sc.variant} size="sm" dot>{sc.label}</Badge>
                    <span className="font-mono text-sm font-bold text-text-primary">{d.montant}</span>
                  </div>
                </div>
                <div className="flex items-center justify-between pt-2 border-t border-surface-border">
                  <span className="text-xs text-text-muted">{d.date} — valide jusqu&apos;au {d.validite}</span>
                  <div className="flex items-center gap-2">
                    {canConvert && (
                      <button
                        onClick={() => setConvertTarget(d)}
                        className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-primary bg-primary/10 text-xs font-semibold"
                      >
                        <Receipt className="w-3.5 h-3.5" />
                        Facturer
                      </button>
                    )}
                    <button
                      onClick={() => handleDownload(d)}
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

        {/* Desktop Table card */}
        <Card className="hidden md:block p-0 overflow-hidden">
          {/* Toolbar */}
          <div className="px-5 py-4 border-b border-surface-border flex items-center gap-3">
            <div className="relative flex-1 max-w-xs">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-text-muted" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Rechercher…"
                className="input-field w-full pl-8 py-1.5 text-sm"
              />
            </div>
            <div className="flex gap-1 ml-auto">
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
                </button>
              ))}
            </div>
          </div>

          {/* Table */}
          {filtered.length === 0 ? (
            <div className="py-16 text-center text-text-muted">
              <FileCheck className="w-10 h-10 mx-auto mb-3 opacity-30" />
              <p className="text-sm">Aucun devis trouvé</p>
            </div>
          ) : (
            <table className="w-full">
              <thead>
                <tr className="border-b border-surface-border bg-background-secondary/30">
                  {["N° Devis", "Client", "Objet", "Montant HT", "Date", "Validité", "Statut", "Actions"].map((h) => (
                    <th key={h} className="text-left px-5 py-3 text-xs font-semibold text-text-muted uppercase tracking-wider">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map((d) => {
                  const sc = STATUS_CONFIG[d.status];
                  const canConvert = d.status === "accepté" || d.status === "envoyé";
                  return (
                    <tr
                      key={d.id}
                      className="border-b border-surface-border last:border-0 hover:bg-surface-hover/50 transition-colors group"
                    >
                      <td className="px-5 py-4 font-mono text-sm text-primary font-semibold">{d.id}</td>
                      <td className="px-5 py-4 text-sm font-medium text-text-primary">{d.client}</td>
                      <td className="px-5 py-4 text-sm text-text-secondary max-w-[200px] truncate">{d.objet}</td>
                      <td className="px-5 py-4 text-sm font-semibold font-mono text-text-primary">{d.montant}</td>
                      <td className="px-5 py-4 text-sm text-text-muted">{d.date}</td>
                      <td className="px-5 py-4 text-sm text-text-muted">{d.validite}</td>
                      <td className="px-5 py-4">
                        <Badge variant={sc.variant} size="sm" dot>{sc.label}</Badge>
                      </td>
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-1">
                          {/* Convert to invoice — primary action */}
                          {canConvert && (
                            <button
                              onClick={() => setConvertTarget(d)}
                              title="Convertir en facture"
                              className="flex items-center gap-1 px-2 py-1 rounded-lg text-primary bg-primary/10 hover:bg-primary/20 transition-colors text-xs font-semibold"
                            >
                              <Receipt className="w-3.5 h-3.5" />
                              <span className="hidden group-hover:inline">Facturer</span>
                            </button>
                          )}

                          {/* Download PDF */}
                          <button
                            onClick={() => handleDownload(d)}
                            title="Télécharger PDF"
                            disabled={downloadingId === d.id}
                            className="p-1.5 rounded-lg text-text-muted hover:text-text-primary hover:bg-surface-active transition-colors"
                          >
                            {downloadingId === d.id ? (
                              <div className="w-4 h-4 border-2 border-text-muted border-t-transparent rounded-full animate-spin" />
                            ) : (
                              <Download className="w-4 h-4" />
                            )}
                          </button>

                          {/* Send */}
                          {d.status === "brouillon" && (
                            <button
                              onClick={() => {
                                setDevis(devis.map((x) => x.id === d.id ? { ...x, status: "envoyé" as DevisStatus } : x));
                                showToast(`Devis ${d.id} envoyé au client`);
                              }}
                              title="Envoyer au client"
                              className="p-1.5 rounded-lg text-text-muted hover:text-status-info hover:bg-status-info/10 transition-colors"
                            >
                              <Send className="w-4 h-4" />
                            </button>
                          )}

                          {/* View */}
                          <button
                            title="Aperçu PDF"
                            onClick={() => {
                              console.log("[DevisClient] aperçu clic:", d.id);
                              handleDownload(d);
                            }}
                            className="p-1.5 rounded-lg text-text-muted hover:text-text-primary hover:bg-surface-active transition-colors"
                          >
                            <Eye className="w-4 h-4" />
                          </button>

                          {/* More menu */}
                          <div className="relative">
                            <button
                              onClick={() => setMenuOpen(menuOpen === d.id ? null : d.id)}
                              className="p-1.5 rounded-lg text-text-muted hover:text-text-primary hover:bg-surface-active transition-colors"
                            >
                              <MoreHorizontal className="w-4 h-4" />
                            </button>
                            {menuOpen === d.id && (
                              <div className="absolute right-0 top-8 z-10 w-36 bg-surface border border-surface-border rounded-xl shadow-card py-1 animate-fade-in">
                                <button
                                  onClick={() => handleDelete(d.id)}
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
          )}

          {/* Footer */}
          <div className="px-5 py-3 border-t border-surface-border flex items-center justify-between">
            <p className="text-xs text-text-muted">{filtered.length} devis affichés</p>
            <div className="flex items-center gap-2 text-xs text-text-muted">
              <Sparkles className="w-3.5 h-3.5 text-primary" />
              <span>
                Utilisez{" "}
                <button onClick={() => setAiOpen(true)} className="text-primary font-semibold hover:underline">
                  Générer avec IA
                </button>{" "}
                pour créer un devis complet en 30 secondes
              </span>
            </div>
          </div>
        </Card>
      </div>

      {/* Mobile FAB */}
      <button
        onClick={() => setNewDevisOpen(true)}
        className="fixed bottom-20 right-4 z-20 md:hidden w-14 h-14 bg-primary rounded-full flex items-center justify-center shadow-lg active:scale-95 transition-transform"
      >
        <Plus className="w-6 h-6 text-background" strokeWidth={2.5} />
      </button>
    </>
  );
}
