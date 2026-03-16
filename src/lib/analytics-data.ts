export type Period = "mois" | "trimestre" | "semestre" | "année";

export interface MonthData {
  month: string;
  shortMonth: string;
  ca: number;
  facture: number;
  devis: number;
  nClients: number;
  nChantiers: number;
  caN1: number; // N-1
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

// Full year monthly data
export const MONTHLY_DATA: MonthData[] = [
  { month: "Janvier",    shortMonth: "Jan", ca: 18200, facture: 22000, devis: 31000, nClients: 4,  nChantiers: 3, caN1: 14800 },
  { month: "Février",    shortMonth: "Fév", ca: 21500, facture: 25500, devis: 38000, nClients: 5,  nChantiers: 4, caN1: 16200 },
  { month: "Mars",       shortMonth: "Mar", ca: 28400, facture: 33500, devis: 51300, nClients: 6,  nChantiers: 5, caN1: 22100 },
  { month: "Avril",      shortMonth: "Avr", ca: 24800, facture: 29000, devis: 44000, nClients: 5,  nChantiers: 4, caN1: 19500 },
  { month: "Mai",        shortMonth: "Mai", ca: 31200, facture: 36500, devis: 58000, nClients: 7,  nChantiers: 6, caN1: 24800 },
  { month: "Juin",       shortMonth: "Jun", ca: 29600, facture: 34000, devis: 52000, nClients: 6,  nChantiers: 5, caN1: 23100 },
  { month: "Juillet",    shortMonth: "Jul", ca: 22100, facture: 26500, devis: 39000, nClients: 4,  nChantiers: 3, caN1: 17800 },
  { month: "Août",       shortMonth: "Aoû", ca: 14800, facture: 18000, devis: 28000, nClients: 3,  nChantiers: 2, caN1: 12400 },
  { month: "Septembre",  shortMonth: "Sep", ca: 26800, facture: 31500, devis: 48000, nClients: 6,  nChantiers: 5, caN1: 21200 },
  { month: "Octobre",    shortMonth: "Oct", ca: 32400, facture: 38000, devis: 61000, nClients: 7,  nChantiers: 6, caN1: 25600 },
  { month: "Novembre",   shortMonth: "Nov", ca: 30100, facture: 35500, devis: 56000, nClients: 6,  nChantiers: 5, caN1: 24400 },
  { month: "Décembre",   shortMonth: "Déc", ca: 27800, facture: 32500, devis: 49000, nClients: 5,  nChantiers: 4, caN1: 22100 },
];

// Only current year to "now" (March 2026 = 3 months)
export const CURRENT_YEAR_DATA = MONTHLY_DATA.slice(0, 3);

export const TOP_CLIENTS: ClientStat[] = [
  { name: "Mairie de Vanves", ca: 85200, factures: 8, type: "Public" },
  { name: "SCI Verdure", ca: 28900, factures: 5, type: "Professionnel" },
  { name: "Martin Leblanc", ca: 12450, factures: 3, type: "Particulier" },
  { name: "Sophie Girard", ca: 5800, factures: 1, type: "Particulier" },
  { name: "M. Bernard", ca: 4200, factures: 2, type: "Particulier" },
];

export const TYPE_BREAKDOWN: TypeBreakdown[] = [
  { name: "Public", value: 85200, color: "#00c97a" },
  { name: "Professionnel", value: 28900, color: "#3b82f6" },
  { name: "Particulier", value: 22450, color: "#f59e0b" },
];

export const FUNNEL_DATA: FunnelStep[] = [
  { label: "Devis créés", value: 42, pct: 100, color: "#8899aa" },
  { label: "Devis envoyés", value: 38, pct: 90, color: "#3b82f6" },
  { label: "Devis acceptés", value: 28, pct: 67, color: "#f59e0b" },
  { label: "Facturés", value: 26, pct: 62, color: "#00c97a" },
  { label: "Payés", value: 24, pct: 57, color: "#00c97a" },
];

// Délai moyen paiement par mois
export const PAYMENT_DELAY: { month: string; days: number }[] = [
  { month: "Jan", days: 28 },
  { month: "Fév", days: 24 },
  { month: "Mar", days: 18 },
];

// Répartition par type de travaux
export const WORK_BREAKDOWN = [
  { name: "Plomberie", value: 38, color: "#00c97a" },
  { name: "Chauffage", value: 28, color: "#3b82f6" },
  { name: "Maintenance", value: 22, color: "#f59e0b" },
  { name: "Rénovation", value: 12, color: "#8b5cf6" },
];

export function getDataForPeriod(period: Period): MonthData[] {
  switch (period) {
    case "mois": return MONTHLY_DATA.slice(2, 3);
    case "trimestre": return MONTHLY_DATA.slice(0, 3);
    case "semestre": return MONTHLY_DATA.slice(6, 12); // H2 N-1 as example
    case "année": return MONTHLY_DATA;
    default: return MONTHLY_DATA;
  }
}

export function sumCA(data: MonthData[]) {
  return data.reduce((s, d) => s + d.ca, 0);
}
export function sumFacture(data: MonthData[]) {
  return data.reduce((s, d) => s + d.facture, 0);
}
export function sumN1(data: MonthData[]) {
  return data.reduce((s, d) => s + d.caN1, 0);
}
