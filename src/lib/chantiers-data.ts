export type ChantierStatus = "en cours" | "terminé" | "planifié" | "en pause";

export interface ChantierEtape {
  id: string;
  label: string;
  done: boolean;
  dueDate?: string;
  assignee?: string;
  category: "prep" | "travaux" | "finition" | "admin";
}

export interface ChantierNote {
  id: string;
  content: string;
  date: string;
  author: string;
  type?: "info" | "warning" | "photo";
}

export interface ChantierDepense {
  id: string;
  label: string;
  montant: number;
  date: string;
  category: "materiau" | "main_oeuvre" | "sous_traitant" | "autre";
}

export interface Chantier {
  id: string;
  client: string;
  type: string;
  address: string;
  city: string;
  description: string;
  budget: number;
  depenses: number;
  progression: number;
  startDate: string; // ISO YYYY-MM-DD
  endDate: string;
  team: string[];
  status: ChantierStatus;
  etapes: ChantierEtape[];
  notes: ChantierNote[];
  depensesList: ChantierDepense[];
  devisId?: string;
  factureId?: string;
}

export const CHANTIERS_DATA: Chantier[] = [
  {
    id: "CH-2024-034",
    client: "Famille Martin",
    type: "Plomberie",
    address: "12 rue du Moulin",
    city: "Paris 15e",
    description: "Rénovation complète de la salle de bain : remplacement baignoire, robinetterie, reconfiguration réseau eau chaude/froide.",
    budget: 8200,
    depenses: 5100,
    progression: 65,
    startDate: "2026-03-04",
    endDate: "2026-03-28",
    team: ["JD"],
    status: "en cours",
    devisId: "DV-2024-155",
    etapes: [
      { id: "e1", label: "Devis accepté et acompte reçu", done: true, category: "admin", dueDate: "04 Mar." },
      { id: "e2", label: "Commande fournitures et matériaux", done: true, category: "prep", dueDate: "05 Mar.", assignee: "JD" },
      { id: "e3", label: "Dépose ancienne installation", done: true, category: "travaux", dueDate: "10 Mar.", assignee: "JD" },
      { id: "e4", label: "Réfection réseau eau froide/chaude", done: true, category: "travaux", dueDate: "14 Mar.", assignee: "JD" },
      { id: "e5", label: "Pose receveur de douche + carrelage", done: false, category: "travaux", dueDate: "21 Mar.", assignee: "JD" },
      { id: "e6", label: "Pose robinetterie et sanitaires", done: false, category: "finition", dueDate: "25 Mar.", assignee: "JD" },
      { id: "e7", label: "Tests étanchéité et mise en service", done: false, category: "finition", dueDate: "27 Mar.", assignee: "JD" },
      { id: "e8", label: "Facturation et clôture chantier", done: false, category: "admin", dueDate: "28 Mar." },
    ],
    notes: [
      { id: "n1", content: "Tuyauterie ancienne en mauvais état, prévoir remplacement complet du réseau eau froide. Devis modifié en conséquence.", date: "10 Mar. 2026", author: "Jean Dupont", type: "warning" },
      { id: "n2", content: "Client souhaite un carrelage 60×60 blanc (ref: LEROY MERLIN #441892). Livraison confirmée le 19 Mar.", date: "12 Mar. 2026", author: "Jean Dupont", type: "info" },
    ],
    depensesList: [
      { id: "d1", label: "Carrelage 60×60 (12m²)", montant: 480, date: "12 Mar.", category: "materiau" },
      { id: "d2", label: "Robinetterie Grohe", montant: 320, date: "08 Mar.", category: "materiau" },
      { id: "d3", label: "Tuyauterie cuivre et raccords", montant: 210, date: "05 Mar.", category: "materiau" },
      { id: "d4", label: "Main-d'œuvre (32h)", montant: 2080, date: "14 Mar.", category: "main_oeuvre" },
      { id: "d5", label: "Location outillage spécifique", montant: 80, date: "10 Mar.", category: "autre" },
    ],
  },
  {
    id: "CH-2024-033",
    client: "SCI Verdure",
    type: "Réseau eau",
    address: "45 av. Victor Hugo",
    city: "Boulogne-Billancourt",
    description: "Mise aux normes réseau eau chaude sanitaire bâtiment — 4 étages, remplacement colonnes montantes.",
    budget: 14500,
    depenses: 14200,
    progression: 100,
    startDate: "2026-02-12",
    endDate: "2026-03-10",
    team: ["JD", "PL"],
    status: "terminé",
    devisId: "DV-2024-148",
    factureId: "FA-2024-088",
    etapes: [
      { id: "e1", label: "Relevé terrain et planning", done: true, category: "prep" },
      { id: "e2", label: "Installation colonnes montantes", done: true, category: "travaux" },
      { id: "e3", label: "Raccordements par étage", done: true, category: "travaux" },
      { id: "e4", label: "Tests de pression", done: true, category: "finition" },
      { id: "e5", label: "PV de réception signé", done: true, category: "admin" },
    ],
    notes: [
      { id: "n1", content: "Chantier terminé dans les délais. Client satisfait. PV de réception signé le 10/03.", date: "10 Mar. 2026", author: "Jean Dupont", type: "info" },
    ],
    depensesList: [
      { id: "d1", label: "Colonnes cuivre DN22 (40ml)", montant: 1800, date: "13 Fév.", category: "materiau" },
      { id: "d2", label: "Raccords et vannes", montant: 640, date: "13 Fév.", category: "materiau" },
      { id: "d3", label: "Main-d'œuvre (120h × 2)", montant: 9600, date: "10 Mar.", category: "main_oeuvre" },
      { id: "d4", label: "Sous-traitant calorifugeage", montant: 2160, date: "08 Mar.", category: "sous_traitant" },
    ],
  },
  {
    id: "CH-2024-035",
    client: "M. Bertrand",
    type: "Chauffage",
    address: "8 allée des Pins",
    city: "Vanves",
    description: "Installation chaudière gaz à condensation + remplacement radiateurs acier.",
    budget: 5600,
    depenses: 0,
    progression: 0,
    startDate: "2026-03-20",
    endDate: "2026-03-25",
    team: ["JD"],
    status: "planifié",
    devisId: "DV-2024-156",
    etapes: [
      { id: "e1", label: "Confirmation RDV client", done: false, category: "admin", dueDate: "18 Mar." },
      { id: "e2", label: "Commande chaudière et radiateurs", done: false, category: "prep", dueDate: "16 Mar.", assignee: "JD" },
      { id: "e3", label: "Dépose ancienne chaudière", done: false, category: "travaux", dueDate: "20 Mar.", assignee: "JD" },
      { id: "e4", label: "Pose chaudière condensation", done: false, category: "travaux", dueDate: "21 Mar.", assignee: "JD" },
      { id: "e5", label: "Remplacement radiateurs (5 pièces)", done: false, category: "travaux", dueDate: "22 Mar.", assignee: "JD" },
      { id: "e6", label: "Mise en service + réglage", done: false, category: "finition", dueDate: "23 Mar.", assignee: "JD" },
      { id: "e7", label: "Notice client + attestation gaz", done: false, category: "admin", dueDate: "25 Mar." },
    ],
    notes: [],
    depensesList: [],
  },
  {
    id: "CH-2024-036",
    client: "Mairie de Vanves",
    type: "Maintenance",
    address: "Place de la République",
    city: "Vanves",
    description: "Maintenance préventive annuelle des installations thermiques de 3 bâtiments municipaux.",
    budget: 22800,
    depenses: 4800,
    progression: 20,
    startDate: "2026-03-01",
    endDate: "2026-04-30",
    team: ["JD", "PL", "ML"],
    status: "en cours",
    devisId: "DV-2024-152",
    factureId: "FA-2024-086",
    etapes: [
      { id: "e1", label: "Diagnostic bâtiment A — chaufferie", done: true, category: "travaux", dueDate: "05 Mar.", assignee: "JD" },
      { id: "e2", label: "Remplacement vannes et joints bât. A", done: true, category: "travaux", dueDate: "10 Mar.", assignee: "PL" },
      { id: "e3", label: "Diagnostic bâtiment B — CVCS", done: false, category: "travaux", dueDate: "24 Mar.", assignee: "JD" },
      { id: "e4", label: "Nettoyage circuit bâtiment B", done: false, category: "travaux", dueDate: "31 Mar.", assignee: "ML" },
      { id: "e5", label: "Diagnostic bâtiment C", done: false, category: "travaux", dueDate: "07 Avr.", assignee: "JD" },
      { id: "e6", label: "Rapport de maintenance complet", done: false, category: "admin", dueDate: "25 Avr." },
      { id: "e7", label: "Dépôt Chorus Pro", done: false, category: "admin", dueDate: "30 Avr." },
    ],
    notes: [
      { id: "n1", content: "Bâtiment A terminé. Rapport partiel transmis à Mme Lefèvre (DST). Bâtiment B à planifier semaine 13.", date: "10 Mar. 2026", author: "Jean Dupont", type: "info" },
    ],
    depensesList: [
      { id: "d1", label: "Main-d'œuvre bât. A (48h)", montant: 3120, date: "10 Mar.", category: "main_oeuvre" },
      { id: "d2", label: "Fournitures bât. A", montant: 680, date: "05 Mar.", category: "materiau" },
      { id: "d3", label: "Déplacements", montant: 320, date: "10 Mar.", category: "autre" },
      { id: "d4", label: "Sous-traitant mesures réglementaires", montant: 680, date: "08 Mar.", category: "sous_traitant" },
    ],
  },
];
