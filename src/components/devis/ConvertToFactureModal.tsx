"use client";

import { useState } from "react";
import { Receipt, CheckCircle2, ArrowRight, X, Calendar, FileText, Loader2 } from "lucide-react";
import Button from "@/components/ui/Button";

interface ConvertToFactureModalProps {
  devis: {
    id:      string;   // numero display (DV-...)
    _uuid?:  string;   // DB uuid
    client:  string;
    objet:   string;
    montant: string;
  };
  onClose: () => void;
  onConfirm: (factureNumero: string) => void;
}

export default function ConvertToFactureModal({ devis, onClose, onConfirm }: ConvertToFactureModalProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState<string | null>(null);

  const today = new Date();
  const echeance = new Date(today);
  echeance.setDate(echeance.getDate() + 30);
  const fmt = (d: Date) =>
    d.toLocaleDateString("fr-FR", { day: "2-digit", month: "short", year: "numeric" });

  const handleConvert = async () => {
    if (!devis._uuid) {
      setError("UUID du devis manquant");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/documents/convert/devis-to-facture", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ devis_id: devis._uuid }),
      });
      const json = await res.json();
      if (!res.ok) { setError(json.error ?? "Erreur"); return; }
      onConfirm(json.numero);
    } catch {
      setError("Erreur réseau");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />

      <div className="relative w-full max-w-md bg-background-secondary border border-surface-border rounded-2xl shadow-card animate-fade-in">
        {/* Header */}
        <div className="flex items-center gap-3 px-5 py-4 border-b border-surface-border">
          <div className="w-8 h-8 rounded-xl bg-primary/10 flex items-center justify-center">
            <Receipt className="w-4 h-4 text-primary" />
          </div>
          <div className="flex-1">
            <h2 className="font-semibold text-text-primary">Convertir en facture</h2>
            <p className="text-xs text-text-muted">Le devis sera clôturé (accepté)</p>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg text-text-muted hover:text-text-primary hover:bg-surface-hover transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-5 space-y-4">
          {/* Devis → Facture visual */}
          <div className="flex items-center gap-3">
            <div className="flex-1 p-3 rounded-xl bg-background border border-surface-border">
              <div className="flex items-center gap-2 mb-2">
                <FileText className="w-3.5 h-3.5 text-text-muted" />
                <span className="text-[10px] font-semibold text-text-muted uppercase tracking-wider">Devis</span>
              </div>
              <p className="font-mono text-sm font-bold text-text-primary">{devis.id}</p>
              <p className="text-xs text-text-muted mt-0.5 truncate">{devis.client}</p>
            </div>

            <ArrowRight className="w-5 h-5 text-primary flex-shrink-0" />

            <div className="flex-1 p-3 rounded-xl bg-primary/5 border border-primary/20">
              <div className="flex items-center gap-2 mb-2">
                <Receipt className="w-3.5 h-3.5 text-primary" />
                <span className="text-[10px] font-semibold text-primary uppercase tracking-wider">Facture</span>
              </div>
              <p className="font-mono text-sm font-bold text-primary">Auto-numérotée</p>
              <p className="text-xs text-text-muted mt-0.5 truncate">{devis.client}</p>
            </div>
          </div>

          {/* Summary */}
          <div className="space-y-2 p-3 rounded-xl bg-background border border-surface-border text-sm">
            <div className="flex justify-between">
              <span className="text-text-muted">Objet</span>
              <span className="text-text-primary font-medium text-right max-w-[200px] truncate">{devis.objet}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-text-muted">Montant HT</span>
              <span className="font-semibold font-mono text-text-primary">{devis.montant}</span>
            </div>
          </div>

          {/* Dates */}
          <div className="grid grid-cols-2 gap-3 text-xs text-text-muted">
            <div className="flex items-center gap-1.5">
              <Calendar className="w-3 h-3" />
              <span>Émission : {fmt(today)}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <Calendar className="w-3 h-3" />
              <span>Échéance : {fmt(echeance)}</span>
            </div>
          </div>

          {error && (
            <p className="text-xs text-red-500 bg-red-500/10 rounded-lg px-3 py-2">{error}</p>
          )}

          <div className="flex gap-2 pt-1">
            <button onClick={onClose} className="btn-ghost flex-1 text-center py-2.5 rounded-xl border border-surface-border text-sm">
              Annuler
            </button>
            <Button
              variant="primary"
              icon={loading ? Loader2 : CheckCircle2}
              onClick={handleConvert}
              disabled={loading}
              className="flex-1 justify-center"
            >
              {loading ? "Création…" : "Créer la facture"}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
