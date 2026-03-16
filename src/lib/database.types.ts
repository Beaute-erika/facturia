export type Json = string | number | boolean | null | { [key: string]: Json } | Json[];

// ─── Enums ───────────────────────────────────────────────────────────────────

export type ClientType = "particulier" | "professionnel";
export type ClientStatut = "actif" | "inactif" | "prospect";

export type DevisStatut = "brouillon" | "envoye" | "accepte" | "refuse" | "expire";
export type FactureStatut = "brouillon" | "envoyee" | "payee" | "en_retard" | "annulee";
export type ChantierStatut = "planifie" | "en_cours" | "termine" | "suspendu";
export type AvisStatut = "sans_reponse" | "repondu" | "signale";
export type AutoStatut = "relance_devis" | "relance_facture" | "rapport_hebdo" | "alerte_retard" | "confirmation_client";

// ─── Row Types ───────────────────────────────────────────────────────────────

export interface UserRow {
  id: string;
  email: string;
  prenom: string;
  nom: string;
  metier: string;
  raison_sociale: string | null;
  forme_juridique: string;
  siret: string | null;
  tva_num: string | null;
  adresse: string | null;
  code_postal: string | null;
  ville: string | null;
  tel: string | null;
  site: string | null;
  logo_url: string | null;
  signature_email: string | null;
  mentions_legales: string | null;
  devis_prefix: string;
  devis_next: number;
  facture_prefix: string;
  facture_next: number;
  tva_default: string;
  delai_paiement: string;
  iban: string | null;
  bic: string | null;
  plan: "starter" | "pro" | "business";
  created_at: string;
  updated_at: string;
}

export interface ClientRow {
  id: string;
  user_id: string;
  type: ClientType;
  statut: ClientStatut;
  nom: string;
  prenom: string | null;
  raison_sociale: string | null;
  email: string | null;
  tel: string | null;
  adresse: string | null;
  code_postal: string | null;
  ville: string | null;
  siret: string | null;
  notes: string | null;
  ca_total: number;
  created_at: string;
  updated_at: string;
}

export interface LigneDevis {
  id: string;
  description: string;
  quantite: number;
  unite: string;
  prix_unitaire: number;
  tva: number;
  total_ht: number;
}

export interface DevisRow {
  id: string;
  user_id: string;
  client_id: string;
  numero: string;
  statut: DevisStatut;
  objet: string;
  date_emission: string;
  date_validite: string;
  lignes: LigneDevis[];
  tva_rate: number;
  montant_ht: number;
  montant_tva: number;
  montant_ttc: number;
  notes: string | null;
  chorus_pro: boolean;
  pdf_url: string | null;
  created_at: string;
  updated_at: string;
}

export interface FactureRow {
  id: string;
  user_id: string;
  client_id: string;
  devis_id: string | null;
  numero: string;
  statut: FactureStatut;
  objet: string;
  date_emission: string;
  date_echeance: string;
  date_paiement: string | null;
  lignes: LigneDevis[];
  tva_rate: number;
  montant_ht: number;
  montant_tva: number;
  montant_ttc: number;
  notes: string | null;
  chorus_pro: boolean;
  num_engagement_chorus: string | null;
  pdf_url: string | null;
  created_at: string;
  updated_at: string;
}

export interface ChantierEtape {
  id: string;
  titre: string;
  description: string | null;
  categorie: "prep" | "travaux" | "finition" | "admin";
  done: boolean;
  date_prevue: string | null;
}

export interface ChantierNote {
  id: string;
  contenu: string;
  created_at: string;
}

export interface ChantierRow {
  id: string;
  user_id: string;
  client_id: string;
  titre: string;
  description: string | null;
  statut: ChantierStatut;
  date_debut: string | null;
  date_fin_prevue: string | null;
  date_fin_reelle: string | null;
  adresse_chantier: string | null;
  progression: number;
  budget_prevu: number | null;
  budget_reel: number | null;
  etapes: ChantierEtape[];
  notes: ChantierNote[];
  created_at: string;
  updated_at: string;
}

export interface AvisGoogleRow {
  id: string;
  user_id: string;
  auteur: string;
  note: 1 | 2 | 3 | 4 | 5;
  contenu: string;
  date_avis: string;
  reponse: string | null;
  date_reponse: string | null;
  statut: AvisStatut;
  created_at: string;
  updated_at: string;
}

export interface AutomatisationConfig {
  delai_jours?: number;
  canal: "email" | "sms" | "both";
  template?: string;
  heure?: string;
  jour_semaine?: number;
}

export interface AutomatisationRow {
  id: string;
  user_id: string;
  type: AutoStatut;
  actif: boolean;
  config: AutomatisationConfig;
  derniere_execution: string | null;
  created_at: string;
  updated_at: string;
}

// ─── Database schema (Supabase generated style) ──────────────────────────────

export interface Database {
  public: {
    Tables: {
      users: {
        Row: UserRow;
        Insert: Omit<UserRow, "created_at" | "updated_at">;
        Update: Partial<Omit<UserRow, "id" | "created_at">>;
      };
      clients: {
        Row: ClientRow;
        Insert: Omit<ClientRow, "id" | "created_at" | "updated_at">;
        Update: Partial<Omit<ClientRow, "id" | "created_at">>;
      };
      devis: {
        Row: DevisRow;
        Insert: Omit<DevisRow, "id" | "created_at" | "updated_at">;
        Update: Partial<Omit<DevisRow, "id" | "created_at">>;
      };
      factures: {
        Row: FactureRow;
        Insert: Omit<FactureRow, "id" | "created_at" | "updated_at">;
        Update: Partial<Omit<FactureRow, "id" | "created_at">>;
      };
      chantiers: {
        Row: ChantierRow;
        Insert: Omit<ChantierRow, "id" | "created_at" | "updated_at">;
        Update: Partial<Omit<ChantierRow, "id" | "created_at">>;
      };
      avis_google: {
        Row: AvisGoogleRow;
        Insert: Omit<AvisGoogleRow, "id" | "created_at" | "updated_at">;
        Update: Partial<Omit<AvisGoogleRow, "id" | "created_at">>;
      };
      automatisations: {
        Row: AutomatisationRow;
        Insert: Omit<AutomatisationRow, "id" | "created_at" | "updated_at">;
        Update: Partial<Omit<AutomatisationRow, "id" | "created_at">>;
      };
    };
  };
}
