"use client";

import { Receipt, CheckCircle2, ArrowRight, X, Calendar, FileText } from "lucide-react";
import Button from "@/components/ui/Button";

interface ConvertToFactureModalProps {
  devis: {
    id: string;
    client: string;
    objet: string;
    montant: string;
  };
  onClose: () => void;
  onConfirm: (factureId: string) => void;
}

export default function ConvertToFactureModal({ devis, onClose, onConfirm }: ConvertToFactureModalProps) {
  const today = new Date();
  const echeance = new Date(today);
  echeance.setDate(echeance.getDate() + 30);
  const fmt = (d: Date) =>
    d.toLocaleDateString("fr-FR", { day: "2-digit", month: "short", year: "numeric" });

  // Generate invoice ID from devis ID
  const factureId = devis.id.replace("DV-", "FA-");

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
            <p className="text-xs text-text-muted">Le devis sera clôturé</p>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg text-text-muted hover:text-text-primary hover:bg-surface-hover transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-5 space-y-4">
          {/* Devis → Facture visual */}
          <div className="flex items-center gap-3">
            {/* Devis */}
            <div className="flex-1 p-3 rounded-xl bg-background border border-surface-border">
              <div className="flex items-center gap-2 mb-2">
                <FileText className="w-3.5 h-3.5 text-text-muted" />
                <span className="text-[10px] font-semibold text-text-muted uppercase tracking-wider">Devis</span>
              </div>
              <p className="font-mono text-sm font-bold text-text-primary">{devis.id}</p>
              <p className="text-xs text-text-muted mt-0.5 truncate">{devis.client}</p>
            </div>

            <ArrowRight className="w-5 h-5 text-primary flex-shrink-0" />

            {/* Facture */}
            <div className="flex-1 p-3 rounded-xl bg-primary/5 border border-primary/20">
              <div className="flex items-center gap-2 mb-2">
                <Receipt className="w-3.5 h-3.5 text-primary" />
                <span className="text-[10px] font-semibold text-primary uppercase tracking-wider">Facture</span>
              </div>
              <p className="font-mono text-sm font-bold text-primary">{factureId}</p>
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
            <div className="flex justify-between">
              <span className="text-text-muted">TVA (10%)</span>
              <span className="font-mono text-text-secondary">
                {(parseFloat(devis.montant.replace(/[^0-9]/g, "")) * 0.1).toLocaleString("fr-FR")} €
              </span>
            </div>
            <div className="flex justify-between border-t border-surface-border pt-2">
              <span className="font-semibold text-text-primary">Total TTC</span>
              <span className="font-bold font-mono text-primary">
                {(parseFloat(devis.montant.replace(/[^0-9]/g, "")) * 1.1).toLocaleString("fr-FR")} €
              </span>
            </div>
          </div>

          {/* Dates */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold text-text-muted uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                <Calendar className="w-3 h-3" /> Date de facture
              </label>
              <input
                type="text"
                defaultValue={fmt(today)}
                className="input-field w-full text-sm"
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-text-muted uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                <Calendar className="w-3 h-3" /> Échéance
              </label>
              <input
                type="text"
                defaultValue={fmt(echeance)}
                className="input-field w-full text-sm"
              />
            </div>
          </div>

          {/* Chorus Pro option */}
          <label className="flex items-center gap-3 p-3 rounded-xl bg-background border border-surface-border cursor-pointer hover:border-primary/30 transition-colors group">
            <input type="checkbox" className="w-4 h-4 accent-[#00c97a]" />
            <div>
              <p className="text-sm font-medium text-text-primary">Déposer sur Chorus Pro</p>
              <p className="text-xs text-text-muted">Envoi automatique pour les clients publics</p>
            </div>
          </label>

          <div className="flex gap-2 pt-1">
            <button onClick={onClose} className="btn-ghost flex-1 text-center py-2.5 rounded-xl border border-surface-border text-sm">
              Annuler
            </button>
            <Button
              variant="primary"
              icon={CheckCircle2}
              onClick={() => onConfirm(factureId)}
              className="flex-1 justify-center"
            >
              Créer la facture
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
