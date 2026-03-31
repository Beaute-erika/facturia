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

export type UserRow = {
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
  plan:                    "starter" | "pro" | "business";
  stripe_customer_id:      string | null;
  stripe_sub_id:           string | null;
  subscription_status:     string | null;
  subscription_period_end: string | null;
  created_at: string;
  updated_at: string;
}

export type ClientRow = {
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
  archived_at: string | null;
  created_at: string;
  updated_at: string;
}

export type LigneDevis = {
  id: string;
  description: string;
  quantite: number;
  unite: string;
  prix_unitaire: number;
  tva: number;
  total_ht: number;
}

export type DevisRow = {
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
  conditions_paiement: string | null;
  remise_percent: number;
  acompte: number;
  chorus_pro: boolean;
  pdf_url: string | null;
  facture_id: string | null;
  bon_commande_id: string | null;
  created_at: string;
  updated_at: string;
}

export type FactureRow = {
  id: string;
  user_id: string;
  client_id: string;
  devis_id: string | null;
  pro_forma_id: string | null;
  bon_livraison_id: string | null;
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
  conditions_paiement: string | null;
  remise_percent: number;
  acompte: number;
  chorus_pro: boolean;
  num_engagement_chorus: string | null;
  chorus_status: "depose" | "en_traitement" | "acceptee" | "rejetee" | null;
  chorus_depot_id: string | null;
  chorus_last_error: string | null;
  chorus_retry_count: number;
  auto_send_chorus: boolean;
  pdf_url: string | null;
  created_at: string;
  updated_at: string;
}

export type ChantierEtape = {
  id: string;
  titre: string;
  description: string | null;
  categorie: "prep" | "travaux" | "finition" | "admin";
  done: boolean;
  date_prevue: string | null;
}

export type ChantierNote = {
  id: string;
  contenu: string;
  created_at: string;
}

export type ChantierRow = {
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

export type AvisGoogleRow = {
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

export type ChorusQueueRow = {
  id: string;
  facture_id: string;
  user_id: string;
  status: "pending" | "processing" | "done" | "error";
  error_message: string | null;
  retry_count: number;
  created_at: string;
  processed_at: string | null;
}

export type NotificationRow = {
  id: string;
  user_id: string;
  type: string;
  title: string;
  message: string | null;
  data: Record<string, unknown> | null;
  read: boolean;
  created_at: string;
}


export type ServiceRow = {
  id:          string;
  user_id:     string;
  name:        string;
  description: string | null;
  price_ht:    number;
  category:    string | null;
  created_at:  string;
  updated_at:  string;
}

// ─── Avoirs ──────────────────────────────────────────────────────────────────

// ─── Frais (Expenses) ────────────────────────────────────────────────────────

export type ExpenseRow = {
  id:           string;
  user_id:      string;
  title:        string;
  amount:       number;
  category:     string | null;
  expense_date: string;       // DATE → YYYY-MM-DD
  status:       string;       // "paid" | "pending" | "reimbursed"
  notes:        string | null;
  created_at:   string;
  updated_at:   string;
}

export type AvoirStatut = "brouillon" | "emis" | "annule";

export type AvoirRow = {
  id:            string;
  user_id:       string;
  facture_id:    string | null;
  numero:        string;
  client_nom:    string;
  client_email:  string | null;
  objet:         string;
  motif:         string | null;
  lignes:        LigneDevis[];
  taux_tva:      number;
  montant_ht:    number;
  montant_tva:   number;
  montant_ttc:   number;
  date_emission: string;
  statut:        AvoirStatut;
  notes:         string | null;
  created_at:    string;
  updated_at:    string;
}

// ─── Factures récurrentes ────────────────────────────────────────────────────

export type RecurrencePeriodicite = "mensuelle" | "trimestrielle" | "semestrielle" | "annuelle";
export type RecurrenceStatut      = "actif" | "suspendu" | "termine";

export type FactureRecurrenteRow = {
  id:                   string;
  user_id:              string;
  client_nom:           string;
  client_email:         string | null;
  objet:                string;
  lignes:               LigneDevis[];
  taux_tva:             number;
  montant_ht:           number;
  montant_tva:          number;
  montant_ttc:          number;
  periodicite:          RecurrencePeriodicite;
  date_debut:           string;
  date_fin:             string | null;
  prochaine_generation: string;
  statut:               RecurrenceStatut;
  notes:                string | null;
  created_at:           string;
  updated_at:           string;
}

// ─── Factures pro forma ──────────────────────────────────────────────────────

export type ProFormaStatut = "brouillon" | "envoye" | "accepte" | "refuse" | "expire";

export type FactureProFormaRow = {
  id:             string;
  user_id:        string;
  numero:         string;
  client_nom:     string;
  client_email:   string | null;
  objet:          string;
  lignes:         LigneDevis[];
  taux_tva:       number;
  montant_ht:     number;
  montant_tva:    number;
  montant_ttc:    number;
  date_emission:  string;
  date_validite:  string | null;
  statut:         ProFormaStatut;
  notes:          string | null;
  created_at:     string;
  updated_at:     string;
}

// ─── Bons de commande ────────────────────────────────────────────────────────

export type BonCommandeStatut = "brouillon" | "envoye" | "confirme" | "annule";

export type BonDeCommandeRow = {
  id:                   string;
  user_id:              string;
  devis_id:             string | null;
  numero:               string;
  client_nom:           string;
  client_email:         string | null;
  objet:                string;
  lignes:               LigneDevis[];
  taux_tva:             number;
  montant_ht:           number;
  montant_tva:          number;
  montant_ttc:          number;
  date_emission:        string;
  date_livraison_prevue: string | null;
  statut:               BonCommandeStatut;
  notes:                string | null;
  created_at:           string;
  updated_at:           string;
}

// ─── Bons de livraison ───────────────────────────────────────────────────────

export type BonLivraisonStatut = "brouillon" | "envoye" | "livre" | "annule";

export type BonLivraisonLigne = {
  id:          string;
  description: string;
  quantite:    number;
  unite:       string;
  reference:   string;
}

export type BonDeLivraisonRow = {
  id:              string;
  user_id:         string;
  bon_commande_id: string | null;
  numero:          string;
  client_nom:     string;
  client_email:   string | null;
  objet:          string;
  lignes:         BonLivraisonLigne[];
  date_emission:  string;
  date_livraison: string | null;
  statut:         BonLivraisonStatut;
  notes:          string | null;
  created_at:     string;
  updated_at:     string;
}

// ─── Document sequences ──────────────────────────────────────────────────────

export type DocumentSequenceRow = {
  id:             string;
  user_id:        string;
  type:           string;
  year:           number;
  current_number: number;
  created_at:     string;
}

// ─── Agent actions log ───────────────────────────────────────────────────────

export type AgentActionLogRow = {
  id:          string;
  user_id:     string;
  action_type: string;
  target_type: string | null;
  target_id:   string | null;
  metadata:    Record<string, unknown> | null;
  created_at:  string;
}

export type AutomatisationConfig = {
  delai_jours?: number;
  canal: "email" | "sms" | "both";
  template?: string;
  heure?: string;
  jour_semaine?: number;
}

export type AutomatisationRow = {
  id: string;
  user_id: string;
  type: AutoStatut;
  actif: boolean;
  config: AutomatisationConfig;
  derniere_execution: string | null;
  created_at: string;
  updated_at: string;
}

// ─── Database — format exact @supabase/supabase-js v2 (PostgrestVersion 12) ──

export type Database = {
  public: {
    Tables: {
      users: {
        Row: UserRow;
        Insert: {
          id: string;
          email: string;
          prenom: string;
          nom: string;
          metier: string;
          raison_sociale?: string | null;
          forme_juridique?: string;
          siret?: string | null;
          tva_num?: string | null;
          adresse?: string | null;
          code_postal?: string | null;
          ville?: string | null;
          tel?: string | null;
          site?: string | null;
          logo_url?: string | null;
          signature_email?: string | null;
          mentions_legales?: string | null;
          devis_prefix?: string;
          devis_next?: number;
          facture_prefix?: string;
          facture_next?: number;
          tva_default?: string;
          delai_paiement?: string;
          iban?: string | null;
          bic?: string | null;
          plan?: "starter" | "pro" | "business";
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Omit<UserRow, "id" | "created_at">>;
        Relationships: [];
      };
      clients: {
        Row: ClientRow;
        Insert: {
          id?: string;
          user_id: string;
          type: ClientType;
          statut?: ClientStatut;
          nom: string;
          prenom?: string | null;
          raison_sociale?: string | null;
          email?: string | null;
          tel?: string | null;
          adresse?: string | null;
          code_postal?: string | null;
          ville?: string | null;
          siret?: string | null;
          notes?: string | null;
          ca_total?: number;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Omit<ClientRow, "id" | "created_at">>;
        Relationships: [
          {
            foreignKeyName: "clients_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "users";
            referencedColumns: ["id"];
          }
        ];
      };
      devis: {
        Row: DevisRow;
        Insert: {
          id?: string;
          user_id: string;
          client_id: string;
          numero: string;
          statut?: DevisStatut;
          objet: string;
          date_emission: string;
          date_validite: string;
          lignes?: LigneDevis[];
          tva_rate?: number;
          montant_ht?: number;
          montant_tva?: number;
          montant_ttc?: number;
          notes?: string | null;
          chorus_pro?: boolean;
          pdf_url?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Omit<DevisRow, "id" | "created_at">>;
        Relationships: [
          {
            foreignKeyName: "devis_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "devis_client_id_fkey";
            columns: ["client_id"];
            isOneToOne: false;
            referencedRelation: "clients";
            referencedColumns: ["id"];
          }
        ];
      };
      factures: {
        Row: FactureRow;
        Insert: {
          id?: string;
          user_id: string;
          client_id: string;
          devis_id?: string | null;
          numero: string;
          statut?: FactureStatut;
          objet: string;
          date_emission: string;
          date_echeance: string;
          date_paiement?: string | null;
          lignes?: LigneDevis[];
          tva_rate?: number;
          montant_ht?: number;
          montant_tva?: number;
          montant_ttc?: number;
          notes?: string | null;
          chorus_pro?: boolean;
          num_engagement_chorus?: string | null;
          pdf_url?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Omit<FactureRow, "id" | "created_at">>;
        Relationships: [
          {
            foreignKeyName: "factures_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "factures_client_id_fkey";
            columns: ["client_id"];
            isOneToOne: false;
            referencedRelation: "clients";
            referencedColumns: ["id"];
          }
        ];
      };
      chantiers: {
        Row: ChantierRow;
        Insert: {
          id?: string;
          user_id: string;
          client_id: string;
          titre: string;
          description?: string | null;
          statut?: ChantierStatut;
          date_debut?: string | null;
          date_fin_prevue?: string | null;
          date_fin_reelle?: string | null;
          adresse_chantier?: string | null;
          progression?: number;
          budget_prevu?: number | null;
          budget_reel?: number | null;
          etapes?: ChantierEtape[];
          notes?: ChantierNote[];
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Omit<ChantierRow, "id" | "created_at">>;
        Relationships: [
          {
            foreignKeyName: "chantiers_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "chantiers_client_id_fkey";
            columns: ["client_id"];
            isOneToOne: false;
            referencedRelation: "clients";
            referencedColumns: ["id"];
          }
        ];
      };
      avis_google: {
        Row: AvisGoogleRow;
        Insert: {
          id?: string;
          user_id: string;
          auteur: string;
          note: 1 | 2 | 3 | 4 | 5;
          contenu: string;
          date_avis: string;
          reponse?: string | null;
          date_reponse?: string | null;
          statut?: AvisStatut;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Omit<AvisGoogleRow, "id" | "created_at">>;
        Relationships: [
          {
            foreignKeyName: "avis_google_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "users";
            referencedColumns: ["id"];
          }
        ];
      };
      automatisations: {
        Row: AutomatisationRow;
        Insert: {
          id?: string;
          user_id: string;
          type: AutoStatut;
          actif?: boolean;
          config: AutomatisationConfig;
          derniere_execution?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Omit<AutomatisationRow, "id" | "created_at">>;
        Relationships: [
          {
            foreignKeyName: "automatisations_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "users";
            referencedColumns: ["id"];
          }
        ];
      };
      chorus_queue: {
        Row: ChorusQueueRow;
        Insert: {
          id?: string;
          facture_id: string;
          user_id: string;
          status?: "pending" | "processing" | "done" | "error";
          error_message?: string | null;
          retry_count?: number;
          created_at?: string;
          processed_at?: string | null;
        };
        Update: Partial<Omit<ChorusQueueRow, "id" | "created_at">>;
        Relationships: [
          {
            foreignKeyName: "chorus_queue_facture_id_fkey";
            columns: ["facture_id"];
            isOneToOne: false;
            referencedRelation: "factures";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "chorus_queue_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "users";
            referencedColumns: ["id"];
          }
        ];
      };
      notifications: {
        Row: NotificationRow;
        Insert: {
          id?: string;
          user_id: string;
          type: string;
          title: string;
          message?: string | null;
          data?: Record<string, unknown> | null;
          read?: boolean;
          created_at?: string;
        };
        Update: Partial<Omit<NotificationRow, "id" | "created_at">>;
        Relationships: [
          {
            foreignKeyName: "notifications_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "users";
            referencedColumns: ["id"];
          }
        ];
      };
      agent_conversations: {
        Row: {
          id:           string;
          user_id:      string;
          context_type: string;
          context_id:   string;
          created_at:   string;
          updated_at:   string;
        };
        Insert: {
          id?:          string;
          user_id:      string;
          context_type: string;
          context_id?:  string;
          created_at?:  string;
          updated_at?:  string;
        };
        Update: Partial<{ context_type: string; context_id: string; updated_at: string }>;
        Relationships: [];
      };
      agent_messages: {
        Row: {
          id:              string;
          conversation_id: string;
          role:            "user" | "assistant";
          content:         string;
          created_at:      string;
        };
        Insert: {
          id?:             string;
          conversation_id: string;
          role:            "user" | "assistant";
          content:         string;
          created_at?:     string;
        };
        Update: Partial<{ content: string }>;
        Relationships: [];
      };
      agent_usage: {
        Row: {
          id:            string;
          user_id:       string;
          year_month:    string;
          message_count: number;
          updated_at:    string;
        };
        Insert: {
          id?:           string;
          user_id:       string;
          year_month:    string;
          message_count?: number;
          updated_at?:   string;
        };
        Update: Partial<{ message_count: number; updated_at: string }>;
        Relationships: [];
      };
      services: {
        Row: ServiceRow;
        Insert: {
          id?:         string;
          user_id:     string;
          name:        string;
          description?: string | null;
          price_ht?:   number;
          category?:   string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Omit<ServiceRow, "id" | "created_at">>;
        Relationships: [];
      };
      avoirs: {
        Row: AvoirRow;
        Insert: {
          id?:            string;
          user_id:        string;
          facture_id?:    string | null;
          numero?:        string;
          client_nom:     string;
          client_email?:  string | null;
          objet:          string;
          motif?:         string | null;
          lignes?:        LigneDevis[];
          taux_tva?:      number;
          montant_ht?:    number;
          montant_tva?:   number;
          montant_ttc?:   number;
          date_emission?: string;
          statut?:        AvoirStatut;
          notes?:         string | null;
          created_at?:    string;
          updated_at?:    string;
        };
        Update: Partial<Omit<AvoirRow, "id" | "created_at">>;
        Relationships: [
          {
            foreignKeyName: "avoirs_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "users";
            referencedColumns: ["id"];
          }
        ];
      };
      factures_pro_forma: {
        Row: FactureProFormaRow;
        Insert: {
          id?:            string;
          user_id:        string;
          numero?:        string;
          client_nom:     string;
          client_email?:  string | null;
          objet:          string;
          lignes?:        LigneDevis[];
          taux_tva?:      number;
          montant_ht?:    number;
          montant_tva?:   number;
          montant_ttc?:   number;
          date_emission?: string;
          date_validite?: string | null;
          statut?:        ProFormaStatut;
          notes?:         string | null;
          created_at?:    string;
          updated_at?:    string;
        };
        Update: Partial<Omit<FactureProFormaRow, "id" | "created_at">>;
        Relationships: [];
      };
      bons_de_commande: {
        Row: BonDeCommandeRow;
        Insert: {
          id?:                   string;
          user_id:               string;
          numero?:               string;
          client_nom:            string;
          client_email?:         string | null;
          objet:                 string;
          lignes?:               LigneDevis[];
          taux_tva?:             number;
          montant_ht?:           number;
          montant_tva?:          number;
          montant_ttc?:          number;
          date_emission?:        string;
          date_livraison_prevue?: string | null;
          statut?:               BonCommandeStatut;
          notes?:                string | null;
          created_at?:           string;
          updated_at?:           string;
        };
        Update: Partial<Omit<BonDeCommandeRow, "id" | "created_at">>;
        Relationships: [];
      };
      bons_de_livraison: {
        Row: BonDeLivraisonRow;
        Insert: {
          id?:             string;
          user_id:         string;
          numero?:         string;
          client_nom:      string;
          client_email?:   string | null;
          objet:           string;
          lignes?:         BonLivraisonLigne[];
          date_emission?:  string;
          date_livraison?: string | null;
          statut?:         BonLivraisonStatut;
          notes?:          string | null;
          created_at?:     string;
          updated_at?:     string;
        };
        Update: Partial<Omit<BonDeLivraisonRow, "id" | "created_at">>;
        Relationships: [];
      };
      factures_recurrentes: {
        Row: FactureRecurrenteRow;
        Insert: {
          id?:                   string;
          user_id:               string;
          client_nom:            string;
          client_email?:         string | null;
          objet:                 string;
          lignes?:               LigneDevis[];
          taux_tva?:             number;
          montant_ht?:           number;
          montant_tva?:          number;
          montant_ttc?:          number;
          periodicite?:          RecurrencePeriodicite;
          date_debut?:           string;
          date_fin?:             string | null;
          prochaine_generation?: string;
          statut?:               RecurrenceStatut;
          notes?:                string | null;
          created_at?:           string;
          updated_at?:           string;
        };
        Update: Partial<Omit<FactureRecurrenteRow, "id" | "created_at">>;
        Relationships: [
          {
            foreignKeyName: "factures_recurrentes_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "users";
            referencedColumns: ["id"];
          }
        ];
      };
      document_sequences: {
        Row: DocumentSequenceRow;
        Insert: {
          id?:             string;
          user_id:         string;
          type:            string;
          year:            number;
          current_number?: number;
          created_at?:     string;
        };
        Update: Partial<Omit<DocumentSequenceRow, "id" | "created_at">>;
        Relationships: [];
      };
      expenses: {
        Row: ExpenseRow;
        Insert: {
          id?:           string;
          user_id:       string;
          title:         string;
          amount:        number;
          category?:     string | null;
          expense_date:  string;
          status?:       string;
          notes?:        string | null;
          created_at?:   string;
          updated_at?:   string;
        };
        Update: Partial<Omit<ExpenseRow, "id" | "user_id" | "created_at">>;
        Relationships: [];
      };
      agent_actions_log: {
        Row: AgentActionLogRow;
        Insert: {
          id?:          string;
          user_id:      string;
          action_type:  string;
          target_type?: string | null;
          target_id?:   string | null;
          metadata?:    Record<string, unknown> | null;
          created_at?:  string;
        };
        Update: Partial<Omit<AgentActionLogRow, "id" | "created_at">>;
        Relationships: [];
      };
    }; // end Tables
    Views: Record<never, never>;
    Functions: {
      increment_agent_usage: {
        Args: { p_user_id: string; p_year_month: string };
        Returns: number;
      };
      get_next_document_number: {
        Args: { p_user_id: string; p_type: string; p_year: number };
        Returns: number;
      };
    };
    Enums: Record<never, never>;
    CompositeTypes: Record<never, never>;
  };
};
