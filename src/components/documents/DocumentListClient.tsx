"use client";

import { useState } from "react";
import {
  Plus, Clock, X,
  FilePlus2, ClipboardList, Truck, FileMinus, Repeat,
} from "lucide-react";
import { clsx } from "clsx";
import Card from "@/components/ui/Card";

// ─── Types ────────────────────────────────────────────────────────────────────

export type DocType =
  | "pro-forma"
  | "bon-commande"
  | "bon-livraison"
  | "avoir"
  | "recurrent";

interface Config {
  title: string;
  description: string;
  Icon: React.ElementType;
  createLabel: string;
  emptyTitle: string;
  emptyDescription: string;
  hint: string;
}

// ─── Config par type ──────────────────────────────────────────────────────────

const CONFIGS: Record<DocType, Config> = {
  "pro-forma": {
    title:            "Factures pro forma",
    description:      "Estimations préliminaires non définitives",
    Icon:             FilePlus2,
    createLabel:      "Nouvelle pro forma",
    emptyTitle:       "Aucune facture pro forma",
    emptyDescription: "Émettez des estimations préliminaires à vos clients. Elles peuvent ensuite être converties en facture définitive.",
    hint:             "Une facture pro forma est un document d'information sans valeur juridique ni fiscale. Elle permet d'annoncer un montant avant la facturation officielle.",
  },
  "bon-commande": {
    title:            "Bons de commande",
    description:      "Documents de commande formelle",
    Icon:             ClipboardList,
    createLabel:      "Nouveau bon de commande",
    emptyTitle:       "Aucun bon de commande",
    emptyDescription: "Formalisez les commandes de vos clients avant l'exécution de la prestation ou la livraison du matériel.",
    hint:             "Le bon de commande engage contractuellement les deux parties. Il précède généralement la facture et sert de référence en cas de litige.",
  },
  "bon-livraison": {
    title:            "Bons de livraison",
    description:      "Documents d'accompagnement de livraison",
    Icon:             Truck,
    createLabel:      "Nouveau bon de livraison",
    emptyTitle:       "Aucun bon de livraison",
    emptyDescription: "Documentez et tracez vos livraisons de matériel ou de prestations auprès de vos clients.",
    hint:             "Le bon de livraison accompagne chaque livraison physique. Il est signé par le client à réception et constitue une preuve de livraison.",
  },
  "avoir": {
    title:            "Avoirs",
    description:      "Crédits et corrections sur factures",
    Icon:             FileMinus,
    createLabel:      "Nouvel avoir",
    emptyTitle:       "Aucun avoir émis",
    emptyDescription: "Les avoirs permettent d'annuler, corriger ou rembourser partiellement une facture déjà émise.",
    hint:             "Un avoir (note de crédit) est une facture négative émise pour corriger une erreur, accorder un geste commercial ou rembourser un client.",
  },
  "recurrent": {
    title:            "Factures récurrentes",
    description:      "Automatisez votre facturation périodique",
    Icon:             Repeat,
    createLabel:      "Nouvelle récurrence",
    emptyTitle:       "Aucune facture récurrente configurée",
    emptyDescription: "Configurez des factures qui se génèrent automatiquement selon une périodicité définie : mensuelle, trimestrielle, annuelle…",
    hint:             "Les factures récurrentes sont idéales pour les contrats d'entretien, abonnements ou prestations régulières. Configurez-les une fois, elles se créent automatiquement.",
  },
};

// ─── Composant ────────────────────────────────────────────────────────────────

export default function DocumentListClient({ type }: { type: DocType }) {
  const [showInfo, setShowInfo] = useState(false);

  const { Icon, title, description, createLabel, emptyTitle, emptyDescription, hint } =
    CONFIGS[type];

  return (
    <div className="space-y-6 animate-fade-in">

      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center flex-shrink-0">
            <Icon className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-text-primary">{title}</h1>
            <p className="text-sm text-text-muted mt-0.5">{description}</p>
          </div>
        </div>
        <button
          onClick={() => setShowInfo(true)}
          className="flex items-center gap-1.5 bg-primary text-background text-sm font-semibold px-4 py-2 rounded-xl hover:bg-primary-400 hover:shadow-glow transition-all active:scale-95 flex-shrink-0"
        >
          <Plus className="w-4 h-4" strokeWidth={2.5} />
          {createLabel}
        </button>
      </div>

      {/* ── Bandeau info développement ─────────────────────────────────────── */}
      {showInfo && (
        <div className="flex items-start justify-between gap-3 px-4 py-3.5 rounded-xl bg-primary/5 border border-primary/15">
          <div className="flex items-start gap-2.5">
            <Clock className="w-4 h-4 text-primary mt-0.5 flex-shrink-0" />
            <div>
              <p className="text-sm font-medium text-text-primary">
                Création de {title.toLowerCase()} — en développement
              </p>
              <p className="text-sm text-text-muted mt-0.5">
                Ce module est prévu dans une prochaine version de Facturia.
                La structure et la navigation sont déjà en place.
              </p>
            </div>
          </div>
          <button
            onClick={() => setShowInfo(false)}
            className="text-text-muted hover:text-text-primary flex-shrink-0 mt-0.5 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* ── État vide ──────────────────────────────────────────────────────── */}
      <Card>
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <div className="w-16 h-16 rounded-2xl bg-surface border border-surface-border flex items-center justify-center mb-4">
            <Icon className="w-8 h-8 text-text-muted" />
          </div>
          <h3 className="text-base font-semibold text-text-primary mb-2">{emptyTitle}</h3>
          <p className="text-sm text-text-muted max-w-sm mb-6 leading-relaxed">{emptyDescription}</p>
          <button
            onClick={() => setShowInfo(true)}
            className="flex items-center gap-1.5 bg-primary text-background text-sm font-semibold px-4 py-2 rounded-xl hover:bg-primary-400 transition-all active:scale-95"
          >
            <Plus className="w-4 h-4" strokeWidth={2.5} />
            {createLabel}
          </button>
        </div>
      </Card>

      {/* ── Bloc info métier ───────────────────────────────────────────────── */}
      <div className={clsx(
        "flex items-start gap-3 px-4 py-3.5 rounded-xl",
        "bg-background-secondary border border-surface-border"
      )}>
        <div className="w-1.5 h-1.5 rounded-full bg-primary mt-2 flex-shrink-0" />
        <p className="text-sm text-text-muted leading-relaxed">{hint}</p>
      </div>

    </div>
  );
}
