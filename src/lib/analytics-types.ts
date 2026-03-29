export type Period = "mois" | "trimestre" | "semestre" | "année";

export interface MonthData {
  month: string;
  shortMonth: string;
  ca: number;       // CA encaissé (factures payées, par date_paiement)
  facture: number;  // CA facturé (factures émises, par date_emission)
  devis: number;    // Total devis créés (montant_ttc)
  nClients: number; // Clients distincts ayant payé
  nChantiers: number;
  caN1: number;     // CA encaissé même période N-1
}

export interface ClientStat {
  name: string;
  ca: number;
  factures: number;
  type: "Particulier" | "Professionnel" | "Public";
}

export interface TypeBreakdown {
  name: string;
  value: number;
  color: string;
}

export interface FunnelStep {
  label: string;
  value: number;
  pct: number;
  color: string;
}

export interface AnalyticsResponse {
  monthly: MonthData[];
  topClients: ClientStat[];
  typeBreakdown: TypeBreakdown[];
  devisStatut: { name: string; value: number; color: string }[];
  funnel: FunnelStep[];
  kpis: {
    caEncaisse: number;
    caFacture: number;
    caEncaisseN1: number;
    tauxConversion: number;      // % devis acceptés / envoyés
    delaiMoyenPaiement: number;  // jours moyens (date_paiement - date_emission)
    panierMoyenDevis: number;
    panierMoyenFacture: number;
    clientsActifs: number;
    ytdCA: number;               // CA encaissé depuis jan 1 (pour objectif annuel)
    nbFacturesPayees: number;
    nbDevisAcceptes: number;
  };
  updatedAt: string;
}
