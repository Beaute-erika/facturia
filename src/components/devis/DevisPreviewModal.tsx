"use client";

import { useEffect, useState } from "react";
import { X, Download, Pencil, ZoomIn, ZoomOut } from "lucide-react";
import Badge from "@/components/ui/Badge";

type DevisStatus = "accepté" | "envoyé" | "en attente" | "brouillon" | "refusé";

const STATUS_CONFIG: Record<DevisStatus, { variant: "success" | "warning" | "error" | "info" | "default"; label: string }> = {
  accepté: { variant: "success", label: "Accepté" },
  envoyé: { variant: "info", label: "Envoyé" },
  "en attente": { variant: "warning", label: "En attente" },
  brouillon: { variant: "default", label: "Brouillon" },
  refusé: { variant: "error", label: "Refusé" },
};

interface DevisRow {
  id: string;
  client: string;
  objet: string;
  montant: string;
  date: string;
  validite: string;
  status: DevisStatus;
}

interface Props {
  devis: DevisRow;
  pdfUrl: string;
  onClose: () => void;
  onDownload: () => void;
  onEdit: () => void;
}

const MIN_ZOOM = 0.5;
const MAX_ZOOM = 2.0;
const ZOOM_STEP = 0.25;

export default function DevisPreviewModal({ devis, pdfUrl, onClose, onDownload, onEdit }: Props) {
  const [zoom, setZoom] = useState(1);
  const sc = STATUS_CONFIG[devis.status] ?? { variant: "default" as const, label: devis.status };

  // ESC pour fermer
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />

      <div className="relative z-10 w-full max-w-4xl flex flex-col bg-surface border border-surface-border rounded-2xl shadow-card animate-fade-in" style={{ height: "90vh" }}>
        {/* Header */}
        <div className="flex items-center gap-3 px-5 py-3 border-b border-surface-border flex-shrink-0">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-mono font-bold text-primary">{devis.id}</span>
              <Badge variant={sc.variant} size="sm" dot>{sc.label}</Badge>
            </div>
            <p className="text-xs text-text-muted truncate mt-0.5">{devis.client} • {devis.objet}</p>
          </div>

          {/* Zoom */}
          <div className="hidden sm:flex items-center gap-0.5 px-2 py-1 rounded-lg bg-background border border-surface-border">
            <button
              onClick={() => setZoom(z => Math.max(MIN_ZOOM, +(z - ZOOM_STEP).toFixed(2)))}
              className="p-1.5 rounded text-text-muted hover:text-text-primary hover:bg-surface-active transition-colors"
              title="Zoom -"
            >
              <ZoomOut className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => setZoom(1)}
              className="px-2 text-xs font-mono text-text-muted hover:text-text-primary transition-colors min-w-[3rem] text-center"
              title="Réinitialiser"
            >
              {Math.round(zoom * 100)}%
            </button>
            <button
              onClick={() => setZoom(z => Math.min(MAX_ZOOM, +(z + ZOOM_STEP).toFixed(2)))}
              className="p-1.5 rounded text-text-muted hover:text-text-primary hover:bg-surface-active transition-colors"
              title="Zoom +"
            >
              <ZoomIn className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => { onEdit(); onClose(); }}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium text-text-muted hover:text-text-primary hover:bg-surface-active transition-colors border border-surface-border"
            >
              <Pencil className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Modifier</span>
            </button>
            <button
              onClick={onDownload}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium text-primary bg-primary/10 hover:bg-primary/20 transition-colors"
            >
              <Download className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Télécharger</span>
            </button>
            <button
              onClick={onClose}
              className="p-2 rounded-lg text-text-muted hover:text-text-primary hover:bg-surface-active transition-colors"
              title="Fermer (ESC)"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* PDF viewer */}
        <div className="flex-1 overflow-auto bg-background-secondary/50 flex justify-center p-4">
          <div
            style={{
              width: `${zoom * 100}%`,
              minWidth: "480px",
              maxWidth: zoom <= 1 ? "100%" : undefined,
              flexShrink: 0,
              transition: "width 0.15s ease",
            }}
          >
            <iframe
              src={pdfUrl}
              title={`Aperçu ${devis.id}`}
              className="w-full rounded-lg bg-white shadow-card"
              style={{ height: `${zoom * 75}vh`, minHeight: "500px", border: "none" }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
