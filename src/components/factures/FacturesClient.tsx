"use client";

import { useState, useEffect, useRef } from "react";
import {
  Plus,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Send,
  Download,
  Search,
  MoreHorizontal,
  Bell,
  Building2,
  Trash2,
  Receipt,
  Pencil,
  Check,
} from "lucide-react";
import { clsx } from "clsx";
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import Badge from "@/components/ui/Badge";
import { SaveStatusBadge } from "@/components/ui/SaveStatusBadge";
import EditFactureModal, { type EditFactureResult } from "./EditFactureModal";
import SendEmailModal from "./SendEmailModal";
import FacturePreviewModal from "./FacturePreviewModal";
import NewFactureModal, { type NewFactureResult } from "./NewFactureModal";
import { generateFacturePDF, buildFactureDataFromRow, type FactureData } from "@/lib/pdf-facture";
import { createBrowserClient } from "@/lib/supabase-client";
import { getChorusFixSuggestion } from "@/lib/chorus-fix";
import ChorusDashboard from "@/components/chorus/ChorusDashboard";
import { useDebounce } from "@/hooks/useDebounce";
import { useAutosave } from "@/hooks/useAutosave";
import { useHistory } from "@/hooks/useHistory";
import { useOfflineSave } from "@/hooks/useOfflineSave";

type FactureStatus = "payée" | "envoyée" | "en retard" | "brouillon";

type ChorusStatut = "depose" | "en_traitement" | "acceptee" | "rejetee";

const CHORUS_MAX_RETRIES = 3;

interface Facture {
  id: string;
  _uuid?: string;
  client: string;
  objet: string;
  montant: string;
  tva: string;
  total: string;
  date: string;
  echeance: string;
  status: FactureStatus;
  chorus: boolean;
  chorus_status?: ChorusStatut | null;
  chorus_last_error?: string | null;
  chorus_retry_count?: number;
  auto_send_chorus?: boolean;
}

type EditingState = { _uuid: string; objet: string; status: FactureStatus };

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
  const [newFactureOpen, setNewFactureOpen] = useState(false);
  const [toast, setToast] = useState<{ msg: string; type: "success" | "info" | "warning" } | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [previewLoadingId, setPreviewLoadingId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingData, setEditingData] = useState<EditingState | null>(null);
  const [showRestoreBanner, setShowRestoreBanner] = useState(false);
  const [pendingDraft, setPendingDraft] = useState<EditingState | null>(null);
  const [isMobile, setIsMobile] = useState(false);
  const [editModalTarget, setEditModalTarget] = useState<{ uuid: string; numero: string } | null>(null);
  const [sendingChorusId, setSendingChorusId] = useState<string | null>(null);
  const [chorusSyncing, setChorusSyncing] = useState(false);
  const [, setLastNotifCheck] = useState<string | null>(null);

  // Snapshot ref — type élargi pour compatibilité avec useAutosave
  const editingSnapshotRef = useRef<Record<string, unknown> | null>(null);
  // Ref pour revoquer les blob URLs proprement
  const previewUrlRef = useRef<string | null>(null);
  // Ref pour le polling Chorus — évite les stale closures sans re-enregistrer l'effet
  const pendingChorusRef = useRef<Facture[]>([]);
  // Ref pour scroller jusqu'au dashboard Chorus depuis le header
  const chorusDashboardRef = useRef<HTMLDivElement>(null);

  // ─── Hooks premium ─────────────────────────────────────────────────────────

  const history = useHistory<EditingState>({ maxStack: 20 });

  const currentEditingUuid = editingId
    ? factures.find((f) => f.id === editingId)?._uuid ?? null
    : null;
  const offlineKey = currentEditingUuid ? `facture:${currentEditingUuid}` : null;

  const { getDraft, clearDraft } = useOfflineSave<EditingState>({
    storageKey: offlineKey,
    data: editingData,
  });

  const debouncedEditingData = useDebounce(
    editingData as ({ _uuid: string } & Record<string, unknown>) | null,
    800,
  );

  const { status: saveStatus, reset: resetSave, isOnline } = useAutosave({
    data: debouncedEditingData,
    snapshotRef: editingSnapshotRef,
    compareKeys: ["objet", "status"],
    buildUrl: (uuid) => `/api/factures/${uuid}`,
    buildPayload: (d) => ({ objet: d.objet, statut: d.status }),
    onError: (msg) => showToast(msg, "warning"),
    onSaved: () => { if (offlineKey) clearDraft(offlineKey); },
  });

  // Dirty state : données locales différentes du snapshot
  const isDirty =
    editingId != null &&
    editingData != null &&
    editingSnapshotRef.current != null &&
    (editingData.objet !== editingSnapshotRef.current.objet ||
      editingData.status !== editingSnapshotRef.current.status);

  // ─── Détection mobile ───────────────────────────────────────────────────────
  useEffect(() => {
    setIsMobile(/iPhone|iPad|iPod|Android/i.test(navigator.userAgent));
  }, []);

  // ─── Protection navigation ──────────────────────────────────────────────────
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (isDirty) { e.preventDefault(); e.returnValue = ""; }
    };
    const handlePageHide = () => {
      if (isDirty) {
        console.log("[FacturesClient] pagehide avec modifications — préservées dans localStorage");
      }
    };
    window.addEventListener("beforeunload", handleBeforeUnload);
    window.addEventListener("pagehide", handlePageHide);
    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload);
      window.removeEventListener("pagehide", handlePageHide);
    };
  }, [isDirty]);

  // ─── Raccourcis clavier Undo / Redo ─────────────────────────────────────────
  useEffect(() => {
    if (!editingId) return;
    const handler = (e: KeyboardEvent) => {
      if (!(e.ctrlKey || e.metaKey) || e.key !== "z") return;
      e.preventDefault();
      const next = e.shiftKey ? history.redo() : history.undo();
      if (!next) return;
      setEditingData(next);
      setFactures((prev) =>
        prev.map((f) =>
          f.id === editingId ? { ...f, objet: next.objet, status: next.status } : f,
        ),
      );
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editingId]);

  // ─── Cleanup preview URL au démontage ───────────────────────────────────────
  useEffect(() => {
    return () => { if (previewUrlRef.current) URL.revokeObjectURL(previewUrlRef.current); };
  }, []);

  // Charge les factures depuis Supabase
  useEffect(() => {
    fetch("/api/factures")
      .then((r) => r.json())
      .then((data) => { if (data.factures) setFactures(data.factures); })
      .catch((err) => { console.error("[FacturesClient] fetch /api/factures:", err); });
  }, []);

  // ─── Polling notifications Chorus (toutes les 30s) ───────────────────────────
  useEffect(() => {
    const poll = async () => {
      try {
        const resp = await fetch("/api/notifications");
        if (!resp.ok) return;
        const data = await resp.json() as { notifications: Array<{ id: string; type: string; title: string; message: string | null }> };
        const notifs = data.notifications ?? [];
        if (notifs.length === 0) return;

        // Afficher un toast par notification (max 2)
        notifs.slice(0, 2).forEach((n) => {
          const isError = n.type.includes("error") || n.type.includes("rejetee");
          showToast(n.title + (n.message ? ` — ${n.message.slice(0, 60)}` : ""), isError ? "warning" : "success");
        });

        // Marquer comme lues
        await fetch("/api/notifications", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ids: notifs.map((n) => n.id) }),
        });

        setLastNotifCheck(new Date().toISOString());
      } catch { /* silencieux */ }
    };

    poll();
    const interval = setInterval(poll, 30_000);
    return () => clearInterval(interval);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ─── Auto-poll statut Chorus (toutes les 10s si dépôts en attente) ─────────
  // Met à jour le ref à chaque rendu — le ref est lu dans l'intervalle
  // pour éviter les stale closures sans re-enregistrer l'effet à chaque changement.
  const hasPendingChorus = factures.some(
    (f) => f.chorus && f._uuid && (f.chorus_status === "depose" || f.chorus_status === "en_traitement"),
  );
  pendingChorusRef.current = factures.filter(
    (f) => f.chorus && f._uuid && (f.chorus_status === "depose" || f.chorus_status === "en_traitement"),
  );

  useEffect(() => {
    if (!hasPendingChorus) {
      setChorusSyncing(false);
      return;
    }

    setChorusSyncing(true);

    const interval = setInterval(async () => {
      for (const f of pendingChorusRef.current) {
        try {
          const resp = await fetch(`/api/chorus/status/${f._uuid}`);
          if (!resp.ok) continue;
          const data = await resp.json() as {
            chorus_status?: string | null;
            chorus_last_error?: string | null;
          };
          if (data.chorus_status && data.chorus_status !== f.chorus_status) {
            setFactures((prev) =>
              prev.map((x) =>
                x.id === f.id
                  ? {
                      ...x,
                      chorus_status: data.chorus_status as ChorusStatut,
                      chorus_last_error: data.chorus_last_error ?? null,
                    }
                  : x,
              ),
            );
            if (data.chorus_status === "acceptee") {
              showToast(`Facture ${f.id} acceptée par Chorus Pro ✓`);
            } else if (data.chorus_status === "rejetee") {
              showToast(`Facture ${f.id} rejetée — vérifiez les détails`, "warning");
            }
          }
        } catch {
          // Silencieux — l'utilisateur sera informé au prochain cycle
        }
      }
    }, 10_000);

    return () => {
      clearInterval(interval);
      setChorusSyncing(false);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hasPendingChorus]);

  // Charge le profil artisan pour les PDFs
  useEffect(() => {
    const supabase = createBrowserClient();
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) return;
      supabase
        .from("users")
        .select("prenom,nom,raison_sociale,adresse,ville,code_postal,siret,email,tel,logo_url")
        .eq("id", user.id)
        .single()
        .then(({ data }) => {
          if (!data) return;
          const nom = data.raison_sociale || [data.prenom, data.nom].filter(Boolean).join(" ");
          const adresse = [data.adresse, [data.code_postal, data.ville].filter(Boolean).join(" ")].filter(Boolean).join(", ");
          setArtisan({ nom, adresse, siret: data.siret || "", email: data.email || user.email || "", tel: data.tel || "", logo_url: data.logo_url ?? null });
        });
    }).catch((err) => { console.error("[FacturesClient] fetch artisan profile:", err); });
  }, []);

  // ─── Helpers ────────────────────────────────────────────────────────────────

  const showToast = (msg: string, type: "success" | "info" | "warning" = "success") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3200);
  };

  /** Entre en mode édition et vérifie si un brouillon local existe. */
  const startEdit = (f: Facture) => {
    setEditingId(f.id);
    editingSnapshotRef.current = { objet: f.objet, status: f.status };
    const initial: EditingState = { _uuid: f._uuid ?? "", objet: f.objet, status: f.status };
    setEditingData(initial);
    history.reset(initial);
    resetSave();

    // Vérifier un brouillon non sauvegardé
    if (f._uuid) {
      const draft = getDraft<EditingState>(`facture:${f._uuid}`);
      if (draft && (draft.objet !== f.objet || draft.status !== f.status)) {
        setPendingDraft(draft);
        setShowRestoreBanner(true);
      }
    }
  };

  const handleRestoreDraft = () => {
    if (!pendingDraft || !editingId) return;
    setEditingData(pendingDraft);
    history.reset(pendingDraft);
    setFactures((prev) =>
      prev.map((f) =>
        f.id === editingId ? { ...f, objet: pendingDraft.objet, status: pendingDraft.status } : f,
      ),
    );
    setShowRestoreBanner(false);
    setPendingDraft(null);
    showToast("Modifications restaurées", "info");
  };

  const handleDiscardDraft = () => {
    if (offlineKey) clearDraft(offlineKey);
    setShowRestoreBanner(false);
    setPendingDraft(null);
  };

  // ─── Handlers existants ─────────────────────────────────────────────────────

  const handleDownload = async (f: Facture) => {
    setDownloadingId(f.id);
    const blob = await generateFacturePDF(buildFactureDataFromRow(f, artisan));
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${f.id}.pdf`;
    a.click();
    URL.revokeObjectURL(url);
    setDownloadingId(null);
    showToast(`PDF ${f.id} téléchargé`, "info");
  };

  const handleOpenPreview = async (f: Facture) => {
    console.log("[FacturesClient] aperçu clic:", f.id);
    if (previewUrlRef.current) {
      URL.revokeObjectURL(previewUrlRef.current);
      previewUrlRef.current = null;
    }
    setPreviewLoadingId(f.id);
    const blob = await generateFacturePDF(buildFactureDataFromRow(f, artisan));
    const url = URL.createObjectURL(blob);
    previewUrlRef.current = url;
    setPreviewUrl(url);
    setPreviewTarget(f);
    setPreviewLoadingId(null);
  };

  const handleClosePreview = () => {
    if (previewUrlRef.current) {
      URL.revokeObjectURL(previewUrlRef.current);
      previewUrlRef.current = null;
    }
    setPreviewUrl(null);
    setPreviewTarget(null);
  };

  /** Met à jour un champ en local + pousse dans l'historique undo/redo. */
  const updateLocal = (id: string, field: keyof Facture, value: string) => {
    setFactures((prev) => prev.map((f) => f.id === id ? { ...f, [field]: value } : f));
    if (editingData) {
      const next: EditingState = { ...editingData, [field]: value } as EditingState;
      setEditingData(next);
      history.push(next);
    }
  };

  const handleMarkPaid = (id: string) => {
    setFactures((prev) => prev.map((f) => f.id === id ? { ...f, status: "payée" as FactureStatus } : f));
    setPreviewTarget(null);
    setMenuOpen(null);
    showToast("Facture marquée comme payée ✓");
  };

  const handleRelance = (f: Facture) => {
    setEmailTarget({ ...f, objet: `[RELANCE] ${f.objet}` });
    setMenuOpen(null);
    showToast(`Relance préparée pour ${f.client}`, "warning");
  };

  /** Applique les modifications complètes d'une facture après EditFactureModal */
  const handleEditSaved = (result: EditFactureResult) => {
    setFactures((prev) =>
      prev.map((f) =>
        f.id === result.id
          ? { ...f, client: result.client, objet: result.objet, montant: result.montant, tva: result.tva, total: result.total, date: result.date, echeance: result.echeance, status: result.status }
          : f,
      ),
    );
    setEditModalTarget(null);
    showToast("Facture mise à jour ✓");
  };

  const handleDelete = (id: string) => {
    setFactures((prev) => prev.filter((f) => f.id !== id));
    setMenuOpen(null);
    showToast("Facture supprimée", "info");
  };

  const handleNewFacture = (result: NewFactureResult) => {
    setFactures((prev) => [result, ...prev]);
    showToast(`Facture ${result.id} créée`);
  };

  const handleSendChorus = async (f: Facture) => {
    if (!f._uuid) {
      console.warn("[FacturesClient] handleSendChorus: _uuid manquant pour", f.id);
      return;
    }
    console.log(`[FacturesClient] handleSendChorus: POST /api/chorus/send/${f._uuid} (facture ${f.id})`);
    setSendingChorusId(f.id);
    try {
      const resp = await fetch(`/api/chorus/send/${f._uuid}`, { method: "POST" });
      const data = await resp.json() as {
        success?: boolean;
        error?: string;
        chorus_status?: string;
        chorus_retry_count?: number;
        retries_remaining?: number;
      };
      console.log(`[FacturesClient] handleSendChorus response: status=${resp.status}`, data);
      if (resp.ok && data.success) {
        setFactures((prev) =>
          prev.map((x) =>
            x.id === f.id
              ? {
                  ...x,
                  chorus_status: "depose" as ChorusStatut,
                  chorus_last_error: null,
                  chorus_retry_count: data.chorus_retry_count ?? (f.chorus_retry_count ?? 0) + 1,
                }
              : x,
          ),
        );
        showToast("Facture envoyée à Chorus Pro ✓");
      } else {
        setFactures((prev) =>
          prev.map((x) =>
            x.id === f.id
              ? { ...x, chorus_retry_count: data.chorus_retry_count ?? (f.chorus_retry_count ?? 0) + 1 }
              : x,
          ),
        );
        const retRem = data.retries_remaining;
        const suffix = retRem !== undefined && retRem > 0 ? ` (${retRem} essai${retRem > 1 ? "s" : ""} restant)` : "";
        showToast((data.error ?? "Erreur Chorus Pro") + suffix, "warning");
      }
    } catch {
      showToast("Erreur réseau lors de l'envoi Chorus", "warning");
    } finally {
      setSendingChorusId(null);
    }
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
          toastColors[toast.type],
        )}>
          {toast.type === "warning" ? (
            <AlertTriangle className="w-4 h-4 flex-shrink-0" />
          ) : toast.type === "info" ? (
            <Clock className="w-4 h-4 flex-shrink-0" />
          ) : (
            <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
          )}
          <span className="text-sm font-medium">{toast.msg}</span>
        </div>
      )}

      {/* Bannière restauration brouillon */}
      {showRestoreBanner && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 flex items-center gap-3 px-4 py-3 bg-surface border border-surface-border rounded-xl shadow-card animate-fade-in max-w-sm w-[calc(100%-2rem)]">
          <span className="text-sm text-text-primary flex-1">Modifications non sauvegardées trouvées</span>
          <button
            onClick={handleRestoreDraft}
            className="px-2.5 py-1 rounded-lg bg-primary text-background text-xs font-semibold flex-shrink-0"
          >
            Restaurer
          </button>
          <button
            onClick={handleDiscardDraft}
            className="px-2.5 py-1 rounded-lg bg-surface-active text-text-muted text-xs font-semibold flex-shrink-0"
          >
            Ignorer
          </button>
        </div>
      )}

      {/* Bannière mobile — isDirty sans beforeunload fiable */}
      {isDirty && isMobile && (
        <div className="fixed top-0 left-0 right-0 z-50 bg-status-warning px-4 py-2 text-xs text-white font-medium text-center">
          Modifications non sauvegardées — ne quittez pas la page
        </div>
      )}

      {/* Bandeau hors ligne */}
      {!isOnline && editingId && (
        <div className="fixed top-0 left-0 right-0 z-40 bg-status-warning/90 px-4 py-2 text-xs text-white font-medium text-center">
          Hors ligne — vos modifications sont préservées localement
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
      {previewTarget && previewUrl && (
        <FacturePreviewModal
          facture={previewTarget}
          pdfUrl={previewUrl}
          onClose={handleClosePreview}
          onDownload={() => handleDownload(previewTarget)}
          onSendEmail={() => { handleClosePreview(); setEmailTarget(previewTarget); }}
          onMarkPaid={() => { handleMarkPaid(previewTarget.id); handleClosePreview(); }}
          onEdit={() => setEditingId(previewTarget.id)}
        />
      )}
      {newFactureOpen && (
        <NewFactureModal
          onClose={() => setNewFactureOpen(false)}
          onCreated={handleNewFacture}
        />
      )}
      {editModalTarget && (
        <EditFactureModal
          factureUuid={editModalTarget.uuid}
          factureNumero={editModalTarget.numero}
          onClose={() => setEditModalTarget(null)}
          onSaved={handleEditSaved}
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
          <div className="hidden md:flex gap-2 items-center">
            {chorusSyncing && (
              <div
                className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-status-info/10 border border-status-info/20 text-status-info text-xs font-medium"
                title={`Suivi Chorus actif — ${factures.filter((f) => f.chorus && (f.chorus_status === "depose" || f.chorus_status === "en_traitement")).length} facture(s) surveillée(s)`}
              >
                <div className="w-1.5 h-1.5 rounded-full bg-status-info animate-pulse" />
                Chorus sync
              </div>
            )}
            <Button
              variant="secondary"
              icon={Building2}
              size="sm"
              onClick={() => {
                console.log("[FacturesClient] chorus header click — scroll vers dashboard");
                chorusDashboardRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
              }}
            >
              Chorus Pro
              {factures.filter((f) => f.chorus && f.chorus_status == null && f.status !== "payée").length > 0 && (
                <span className="ml-1 px-1.5 py-0.5 rounded-full bg-status-info/20 text-status-info text-xs font-bold leading-none">
                  {factures.filter((f) => f.chorus && f.chorus_status == null && f.status !== "payée").length}
                </span>
              )}
            </Button>
            <Button
              variant="primary"
              icon={Plus}
              onClick={() => { console.log("[FacturesClient] nouvelle facture clic"); setNewFactureOpen(true); }}
            >
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

        {/* Dashboard Chorus Pro (plan pro+, masqué si aucune facture Chorus) */}
        <div ref={chorusDashboardRef}>
          <ChorusDashboard />
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
                    {f.chorus && f.chorus_status && (
                      <Badge
                        variant={
                          f.chorus_status === "acceptee" ? "success"
                          : f.chorus_status === "rejetee" ? "error"
                          : f.chorus_status === "en_traitement" ? "warning"
                          : "info"
                        }
                        size="sm"
                      >
                        {f.chorus_status === "acceptee" ? "✓ Acceptée"
                          : f.chorus_status === "rejetee" ? "Rejetée"
                          : f.chorus_status === "en_traitement" ? "En traitement"
                          : "Déposée"}
                      </Badge>
                    )}
                  </div>
                </div>
                <div className="flex items-center justify-between pt-2 border-t border-surface-border">
                  <span className={clsx(
                    "text-xs",
                    f.status === "en retard" ? "text-status-error font-semibold" : "text-text-muted",
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
                      : "text-text-muted hover:text-text-primary hover:bg-surface-hover",
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
                    const isEditing = editingId === f.id;
                    const isPreviewLoading = previewLoadingId === f.id;
                    return (
                      <tr
                        key={f.id}
                        onClick={() => !isEditing && handleOpenPreview(f)}
                        className={clsx(
                          "border-b border-surface-border last:border-0 transition-colors group",
                          isEditing ? "bg-primary/5" : "hover:bg-surface-hover/50 cursor-pointer",
                        )}
                      >
                        <td className="px-4 py-4 font-mono text-sm text-primary font-semibold">
                          {isPreviewLoading ? (
                            <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                          ) : f.id}
                        </td>
                        <td className="px-4 py-4 text-sm font-medium text-text-primary whitespace-nowrap">{f.client}</td>
                        <td className="px-4 py-4 text-sm text-text-secondary max-w-[160px]">
                          {isEditing ? (
                            <input
                              autoFocus
                              value={f.objet}
                              onClick={(e) => e.stopPropagation()}
                              onChange={(e) => updateLocal(f.id, "objet", e.target.value)}
                              className="input-field text-sm w-full"
                            />
                          ) : (
                            <span
                              className="truncate block"
                              onDoubleClick={(e) => { e.stopPropagation(); startEdit(f); }}
                            >
                              {f.objet}
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-4 text-sm font-mono text-text-secondary whitespace-nowrap">{f.montant}</td>
                        <td className="px-4 py-4 text-sm font-semibold font-mono text-text-primary whitespace-nowrap">{f.total}</td>
                        <td className="px-4 py-4 text-sm text-text-muted whitespace-nowrap">{f.date}</td>
                        <td className={clsx(
                          "px-4 py-4 text-sm whitespace-nowrap",
                          f.status === "en retard" ? "text-status-error font-semibold" : "text-text-muted",
                        )}>
                          {f.echeance}
                        </td>
                        <td className="px-4 py-4">
                          {isEditing ? (
                            <select
                              value={f.status}
                              onClick={(e) => e.stopPropagation()}
                              onChange={(e) => updateLocal(f.id, "status", e.target.value)}
                              className="input-field text-xs py-1"
                            >
                              {(Object.keys(STATUS_CONFIG) as FactureStatus[]).map((s) => (
                                <option key={s} value={s}>{STATUS_CONFIG[s].label}</option>
                              ))}
                            </select>
                          ) : (
                            <Badge variant={sc.variant} size="sm" dot>{sc.label}</Badge>
                          )}
                        </td>
                        <td className="px-4 py-4">
                          {f.chorus ? (
                            f.chorus_status === "acceptee" ? (
                              <Badge variant="success" size="sm" dot>Acceptée</Badge>
                            ) : f.chorus_status === "depose" ? (
                              <Badge variant="info" size="sm" dot>Déposée</Badge>
                            ) : f.chorus_status === "en_traitement" ? (
                              <Badge variant="warning" size="sm" dot>En traitement</Badge>
                            ) : f.chorus_status === "rejetee" ? (
                              <div className="space-y-0.5">
                                <span
                                  title={(() => {
                                    const fix = getChorusFixSuggestion(f.chorus_last_error);
                                    return `${fix.message}\n→ ${fix.action}`;
                                  })()}
                                  className="cursor-help"
                                >
                                  <Badge variant="error" size="sm" dot>Rejetée ⓘ</Badge>
                                </span>
                                {f.chorus_last_error && (
                                  <p
                                    className="text-xs text-status-error/70 leading-tight max-w-[130px] truncate"
                                    title={f.chorus_last_error}
                                  >
                                    {f.chorus_last_error}
                                  </p>
                                )}
                              </div>
                            ) : (
                              <Badge variant="default" size="sm" dot>En préparation</Badge>
                            )
                          ) : (
                            <span className="text-text-muted text-sm">—</span>
                          )}
                        </td>
                        <td className="px-4 py-4">
                          <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                            {/* Terminer l'inline editing (si actif) */}
                            {isEditing && (
                              <button
                                title="Terminer"
                                onClick={() => setEditingId(null)}
                                className="p-1.5 rounded-lg transition-colors text-primary bg-primary/10 hover:bg-primary/20"
                              >
                                <Check className="w-4 h-4" />
                              </button>
                            )}
                            {/* Modifier (ouvre la modale complète) */}
                            {!isEditing && f._uuid && (
                              <button
                                title="Modifier la facture complète"
                                onClick={() => setEditModalTarget({ uuid: f._uuid!, numero: f.id })}
                                className="p-1.5 rounded-lg transition-colors text-text-muted hover:text-text-primary hover:bg-surface-active"
                              >
                                <Pencil className="w-4 h-4" />
                              </button>
                            )}

                            {/* Badge d'état de sauvegarde */}
                            <SaveStatusBadge
                              status={saveStatus}
                              isDirty={isDirty}
                              isEditing={isEditing}
                            />

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

                            {/* Bouton Chorus Pro dynamique */}
                            {f.chorus && f.status !== "payée" && (() => {
                              const retries = f.chorus_retry_count ?? 0;
                              const isRejetee = f.chorus_status === "rejetee";
                              const isSending = sendingChorusId === f.id;
                              const isAcceptee = f.chorus_status === "acceptee";
                              const retryBlocked = isRejetee && retries >= CHORUS_MAX_RETRIES;

                              if (isAcceptee) return null;

                              const label = isSending
                                ? "En cours…"
                                : isRejetee
                                ? "Renvoyer"
                                : f.chorus_status == null
                                ? "Envoyer"
                                : null;

                              if (!label && !isSending) return null;

                              const titleText = retryBlocked
                                ? `Limite de ${CHORUS_MAX_RETRIES} tentatives atteinte`
                                : isRejetee
                                ? `Renvoyer à Chorus Pro (tentative ${retries + 1}/${CHORUS_MAX_RETRIES + 1})`
                                : "Envoyer à Chorus Pro";

                              return (
                                <button
                                  title={titleText}
                                  onClick={() => {
                                    if (retryBlocked) return;
                                    console.log(
                                      isRejetee
                                        ? `[FacturesClient] chorus retry click: ${f.id} (uuid=${f._uuid}, retries=${retries})`
                                        : `[FacturesClient] chorus send click: ${f.id} (uuid=${f._uuid})`,
                                    );
                                    handleSendChorus(f);
                                  }}
                                  disabled={isSending || retryBlocked}
                                  className={clsx(
                                    "flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-medium transition-colors",
                                    retryBlocked
                                      ? "opacity-40 cursor-not-allowed text-text-muted bg-surface-active"
                                      : isRejetee
                                      ? "text-status-error bg-status-error/10 hover:bg-status-error/20"
                                      : "text-status-info bg-status-info/10 hover:bg-status-info/20",
                                  )}
                                >
                                  {isSending ? (
                                    <div className={clsx(
                                      "w-3 h-3 border-2 border-t-transparent rounded-full animate-spin",
                                      isRejetee ? "border-status-error" : "border-status-info",
                                    )} />
                                  ) : (
                                    <Building2 className="w-3 h-3" />
                                  )}
                                  {label}
                                </button>
                              );
                            })()}

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
        onClick={() => { console.log("[FacturesClient] nouvelle facture clic (FAB)"); setNewFactureOpen(true); }}
        className="fixed bottom-20 right-4 z-20 md:hidden w-14 h-14 bg-primary rounded-full flex items-center justify-center shadow-lg active:scale-95 transition-transform"
      >
        <Plus className="w-6 h-6 text-background" strokeWidth={2.5} />
      </button>
    </>
  );
}
