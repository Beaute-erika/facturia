export type ClientType = "Particulier" | "Professionnel" | "Public";
export type ClientStatus = "actif" | "prospect" | "inactif" | "devis";

export interface ClientDocument {
  id: string;
  type: "devis" | "facture";
  objet: string;
  montant: string;
  date: string;
  status: string;
}

export interface ClientChantier {
  id: string;
  objet: string;
  date: string;
  montant: string;
  progression: number;
  status: "en cours" | "terminé" | "planifié";
}

export interface ClientNote {
  id: string;
  content: string;
  date: string;
  author: string;
}

export interface Client {
  id: number;
  _uuid?: string;      // UUID Supabase — présent sur les clients chargés depuis la DB
  archived?: boolean;  // true si archived_at est non-null en base
  name: string;
  type: ClientType;
  status: ClientStatus;
  city: string;
  address: string;
  phone: string;
  email: string;
  siret?: string;
  tvaNum?: string;
  contactName?: string;
  ca: number;
  chantiers: number;
  createdAt: string;
  lastActivity: string;
  documents: ClientDocument[];
  chantiersList: ClientChantier[];
  notes: ClientNote[];
  tags?: string[];
}

export const CLIENTS_DATA: Client[] = [
  {
    id: 1,
    name: "Martin Leblanc",
    type: "Particulier",
    status: "actif",
    city: "Paris 15e",
    address: "42 avenue Félix Faure, 75015 Paris",
    phone: "06 12 34 56 78",
    email: "martin.l@email.com",
    ca: 12450,
    chantiers: 3,
    createdAt: "Janv. 2024",
    lastActivity: "14 Mar. 2026",
    tags: ["VIP", "Fidèle"],
    documents: [
      { id: "FA-2024-089", type: "facture", objet: "Rénovation salle de bain", montant: "4 140 €", date: "14 Mar. 2026", status: "payée" },
      { id: "DV-2024-120", type: "devis", objet: "Réfection cuisine", montant: "6 800 €", date: "02 Jan. 2026", status: "accepté" },
      { id: "FA-2024-071", type: "facture", objet: "Débouchage canalisation", montant: "480 €", date: "15 Nov. 2025", status: "payée" },
    ],
    chantiersList: [
      { id: "CH-2024-034", objet: "Rénovation salle de bain", date: "04–28 Mar. 2026", montant: "8 200 €", progression: 65, status: "en cours" },
      { id: "CH-2023-018", objet: "Remplacement chauffe-eau", date: "Juin 2025", montant: "1 850 €", progression: 100, status: "terminé" },
      { id: "CH-2023-009", objet: "Débouchage urgence", date: "Nov. 2025", montant: "480 €", progression: 100, status: "terminé" },
    ],
    notes: [
      { id: "n1", content: "Client très ponctuel dans ses paiements. Préfère les RDV le matin.", date: "10 Mar. 2026", author: "Jean Dupont" },
      { id: "n2", content: "Intéressé par une rénovation de sa cuisine en 2026. À recontacter en avril.", date: "02 Jan. 2026", author: "Jean Dupont" },
    ],
  },
  {
    id: 2,
    name: "Sophie Girard",
    type: "Particulier",
    status: "devis",
    city: "Paris 7e",
    address: "15 rue de Grenelle, 75007 Paris",
    phone: "06 98 76 54 32",
    email: "s.girard@email.com",
    ca: 5800,
    chantiers: 1,
    createdAt: "Mar. 2026",
    lastActivity: "12 Mar. 2026",
    documents: [
      { id: "DV-2024-156", type: "devis", objet: "Installation chaudière gaz", montant: "5 800 €", date: "12 Mar. 2026", status: "envoyé" },
    ],
    chantiersList: [],
    notes: [
      { id: "n3", content: "Recommandée par Martin Leblanc. Propriétaire d'un appartement 4 pièces.", date: "12 Mar. 2026", author: "Jean Dupont" },
    ],
  },
  {
    id: 3,
    name: "SCI Verdure",
    type: "Professionnel",
    status: "actif",
    city: "Boulogne-Billancourt",
    address: "45 avenue Victor Hugo, 92100 Boulogne-Billancourt",
    phone: "01 23 45 67 89",
    email: "contact@sciverdure.fr",
    siret: "456 789 123 00034",
    tvaNum: "FR45 456789123",
    contactName: "M. Alain Verdure (Gérant)",
    ca: 28900,
    chantiers: 5,
    createdAt: "Fév. 2023",
    lastActivity: "10 Mar. 2026",
    tags: ["Compte clé", "Récurrent"],
    documents: [
      { id: "FA-2024-088", type: "facture", objet: "Travaux réseau eau froide", montant: "8 160 €", date: "10 Mar. 2026", status: "envoyée" },
      { id: "DV-2024-153", type: "devis", objet: "Mise aux normes réseau eau chaude", montant: "14 500 €", date: "05 Mar. 2026", status: "brouillon" },
      { id: "FA-2024-075", type: "facture", objet: "Réfection sanitaires immeuble A", montant: "5 200 €", date: "15 Déc. 2025", status: "payée" },
    ],
    chantiersList: [
      { id: "CH-2024-036", objet: "Mise aux normes réseau eau chaude", date: "En cours", montant: "14 500 €", progression: 20, status: "en cours" },
      { id: "CH-2023-033", objet: "Réfection sanitaires immeuble A", date: "Déc. 2025", montant: "5 200 €", progression: 100, status: "terminé" },
    ],
    notes: [
      { id: "n4", content: "Gère un portefeuille de 8 immeubles. Contrat cadre annuel à renouveler en juin.", date: "01 Mar. 2026", author: "Jean Dupont" },
    ],
  },
  {
    id: 4,
    name: "Pierre Moreau",
    type: "Particulier",
    status: "prospect",
    city: "Issy-les-Moulineaux",
    address: "8 rue du Président Wilson, 92130 Issy-les-Moulineaux",
    phone: "06 45 67 89 01",
    email: "p.moreau@email.com",
    ca: 0,
    chantiers: 0,
    createdAt: "Mar. 2026",
    lastActivity: "16 Mar. 2026",
    documents: [],
    chantiersList: [],
    notes: [
      { id: "n5", content: "A appelé suite à une fuite urgente. Devis à envoyer pour installation robinetterie.", date: "16 Mar. 2026", author: "Jean Dupont" },
    ],
  },
  {
    id: 5,
    name: "Mairie de Vanves",
    type: "Public",
    status: "actif",
    city: "Vanves",
    address: "Place de la République, 92170 Vanves",
    phone: "01 41 33 95 00",
    email: "travaux@vanves.fr",
    siret: "217 800 565 00014",
    contactName: "Mme Lefèvre (DST)",
    ca: 85200,
    chantiers: 8,
    createdAt: "Jan. 2022",
    lastActivity: "01 Mar. 2026",
    tags: ["Marché public", "Chorus Pro"],
    documents: [
      { id: "FA-2024-086", type: "facture", objet: "Maintenance préventive bâtiment", montant: "14 880 €", date: "01 Mar. 2026", status: "envoyée" },
      { id: "DV-2024-152", type: "devis", objet: "Révision chauffage bâtiment A", montant: "22 800 €", date: "01 Mar. 2026", status: "accepté" },
    ],
    chantiersList: [
      { id: "CH-2024-036", objet: "Maintenance chauffage bâtiments municipaux", date: "En cours", montant: "22 800 €", progression: 20, status: "en cours" },
    ],
    notes: [
      { id: "n6", content: "Marché public annuel. Facturation obligatoire via Chorus Pro. Contact : Mme Lefèvre, 01 41 33 95 12.", date: "15 Jan. 2026", author: "Jean Dupont" },
    ],
  },
];
