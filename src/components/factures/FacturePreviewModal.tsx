"use client";

import { X, Download, Send, CheckCircle2, Building2, Calendar, FileText, Euro } from "lucide-react";
import Badge from "@/components/ui/Badge";
import Button from "@/components/ui/Button";

interface FactureRow {
  id: string;
  client: string;
  objet: string;
  montant: string;
  tva: string;
  total: string;
  date: string;
  echeance: string;
  status: string;
  chorus: boolean;
}

interface FacturePreviewModalProps {
  facture: FactureRow;
  onClose: () => void;
  onDownload: () => void;
  onSendEmail: () => void;
  onMarkPaid: () => void;
}

const STATUS_CONFIG: Record<string, { variant: "success" | "warning" | "error" | "info" | "default"; label: string }> = {
  payée: { variant: "success", label: "Payée" },
  envoyée: { variant: "info", label: "Envoyée" },
  "en retard": { variant: "error", label: "En retard" },
  brouillon: { variant: "default", label: "Brouillon" },
};

const LIGNES_MOCK = [
  { designation: "Main-d'œuvre (taux horaire)", qte: 8, unite: "h", pu: 65, tva: 10 },
  { designation: "Fournitures et matériaux", qte: 1, unite: "forfait", pu: 280, tva: 20 },
  { designation: "Déplacement", qte: 1, unite: "forfait", pu: 80, tva: 20 },
];

export default function FacturePreviewModal({
  facture,
  onClose,
  onDownload,
  onSendEmail,
  onMarkPaid,
}: FacturePreviewModalProps) {
  const sc = STATUS_CONFIG[facture.status] || { variant: "default" as const, label: facture.status };
  const ht = parseFloat(facture.montant.replace(/[^0-9]/g, "")) || 0;
  const tva = parseFloat(facture.tva.replace(/[^0-9]/g, "")) || 0;
  const ttc = parseFloat(facture.total.replace(/[^0-9]/g, "")) || ht + tva;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />

      <div className="relative w-full max-w-2xl max-h-[90vh] overflow-y-auto bg-background-secondary border border-surface-border rounded-2xl shadow-card animate-fade-in">
        {/* Header */}
        <div className="sticky top-0 z-10 flex items-center gap-3 px-5 py-4 border-b border-surface-border bg-background-secondary">
          <div className="w-8 h-8 rounded-xl bg-primary/10 flex items-center justify-center">
            <FileText className="w-4 h-4 text-primary" />
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <h2 className="font-semibold text-text-primary font-mono">{facture.id}</h2>
              <Badge variant={sc.variant} size="sm" dot>{sc.label}</Badge>
              {facture.chorus && <Badge variant="success" size="sm">Chorus Pro</Badge>}
            </div>
            <p className="text-xs text-text-muted truncate">{facture.client} • {facture.objet}</p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="ghost" icon={Download} size="sm" onClick={onDownload}>PDF</Button>
            {facture.status !== "payée" && (
              <Button variant="secondary" icon={Send} size="sm" onClick={onSendEmail}>Envoyer</Button>
            )}
            <button onClick={onClose} className="p-1.5 rounded-lg text-text-muted hover:text-text-primary hover:bg-surface-hover transition-colors">
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        <div className="p-5 space-y-5">
          {/* Invoice header mock */}
          <div className="bg-primary rounded-xl p-5">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xl font-bold text-background">Facturia</p>
                <p className="text-background/70 text-xs mt-0.5">Jean Dupont — Plomberie Dupont</p>
                <p className="text-background/60 text-xs">24 rue des Artisans, 75015 Paris</p>
                <p className="text-background/60 text-xs">SIRET : 123 456 789 00012</p>
              </div>
              <div className="text-right">
                <p className="text-background/70 text-xs font-semibold uppercase tracking-wider">Facture</p>
                <p className="text-xl font-bold text-background font-mono">{facture.id}</p>
              </div>
            </div>
          </div>

          {/* Meta */}
          <div className="grid grid-cols-3 gap-3">
            {[
              { icon: Building2, label: "Client", value: facture.client },
              { icon: Calendar, label: "Date", value: facture.date },
              { icon: Calendar, label: "Échéance", value: facture.echeance },
            ].map((m, i) => (
              <div key={i} className="p-3 rounded-xl bg-background border border-surface-border">
                <div className="flex items-center gap-1.5 mb-1.5">
                  <m.icon className="w-3.5 h-3.5 text-text-muted" />
                  <span className="text-[10px] font-semibold text-text-muted uppercase tracking-wider">{m.label}</span>
                </div>
                <p className="text-sm font-semibold text-text-primary truncate">{m.value}</p>
              </div>
            ))}
          </div>

          {/* Objet */}
          <div className="p-3 rounded-xl bg-background border border-surface-border">
            <p className="text-[10px] font-semibold text-text-muted uppercase tracking-wider mb-1">Objet</p>
            <p className="text-sm text-text-primary">{facture.objet}</p>
          </div>

          {/* Line items */}
          <div className="rounded-xl border border-surface-border overflow-hidden">
            <div className="px-4 py-2.5 bg-surface/50 border-b border-surface-border">
              <p className="text-[10px] font-semibold text-text-muted uppercase tracking-wider">Détail des prestations</p>
            </div>
            <table className="w-full">
              <thead>
                <tr className="border-b border-surface-border">
                  <th className="text-left px-4 py-2 text-xs text-text-muted">Désignation</th>
                  <th className="text-right px-4 py-2 text-xs text-text-muted">Qté</th>
                  <th className="text-right px-4 py-2 text-xs text-text-muted">P.U. HT</th>
                  <th className="text-right px-4 py-2 text-xs text-text-muted">TVA</th>
                  <th className="text-right px-4 py-2 text-xs text-text-muted">Total HT</th>
                </tr>
              </thead>
              <tbody>
                {LIGNES_MOCK.map((l, i) => (
                  <tr key={i} className="border-b border-surface-border last:border-0">
                    <td className="px-4 py-3 text-sm text-text-primary">{l.designation}</td>
                    <td className="px-4 py-3 text-right text-sm text-text-muted font-mono">{l.qte} {l.unite}</td>
                    <td className="px-4 py-3 text-right text-sm text-text-muted font-mono">{l.pu.toLocaleString("fr-FR")} €</td>
                    <td className="px-4 py-3 text-right text-sm text-text-muted">{l.tva}%</td>
                    <td className="px-4 py-3 text-right text-sm font-semibold font-mono text-text-primary">
                      {(l.qte * l.pu).toLocaleString("fr-FR")} €
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Totals */}
          <div className="flex justify-end">
            <div className="w-64 space-y-2">
              {[
                { label: "Total HT", value: `${ht.toLocaleString("fr-FR")} €`, highlight: false },
                { label: "TVA", value: `${tva.toLocaleString("fr-FR")} €`, highlight: false },
                { label: "Net à payer TTC", value: `${ttc.toLocaleString("fr-FR")} €`, highlight: true },
              ].map((t, i) => (
                <div
                  key={i}
                  className={`flex justify-between items-center px-4 py-2 rounded-xl text-sm ${
                    t.highlight
                      ? "bg-primary text-background font-bold"
                      : "text-text-secondary"
                  }`}
                >
                  <span>{t.label}</span>
                  <span className="font-mono font-semibold">{t.value}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Payment info */}
          <div className="p-4 rounded-xl bg-background border border-surface-border space-y-2">
            <div className="flex items-center gap-2 mb-2">
              <Euro className="w-4 h-4 text-text-muted" />
              <p className="text-xs font-semibold text-text-muted uppercase tracking-wider">Modalités de paiement</p>
            </div>
            <div className="grid grid-cols-2 gap-2 text-sm">
              <div><span className="text-text-muted">Mode :</span> <span className="text-text-primary">Virement bancaire</span></div>
              <div><span className="text-text-muted">Échéance :</span> <span className="text-text-primary">{facture.echeance}</span></div>
            </div>
            <p className="text-xs font-mono text-text-muted">IBAN : FR76 3000 6000 0112 3456 7890 189</p>
            <p className="text-xs text-text-muted italic">
              En cas de retard : indemnité forfaitaire 40 € + pénalités 3× taux légal.
            </p>
          </div>

          {/* Actions */}
          <div className="flex gap-2 pt-1">
            <Button variant="secondary" icon={Download} onClick={onDownload} className="flex-1 justify-center">
              Télécharger PDF
            </Button>
            {facture.status !== "payée" && (
              <>
                <Button variant="secondary" icon={Send} onClick={onSendEmail} className="flex-1 justify-center">
                  Envoyer par email
                </Button>
                <Button variant="primary" icon={CheckCircle2} onClick={onMarkPaid} className="flex-1 justify-center">
                  Marquer payée
                </Button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
