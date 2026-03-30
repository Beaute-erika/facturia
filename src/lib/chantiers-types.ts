export type ChantierStatus = "en cours" | "terminé" | "planifié" | "suspendu";

export interface ChantierEtape {
  id: string;
  titre: string;
  categorie: "prep" | "travaux" | "finition" | "admin";
  done: boolean;
  date_prevue: string | null;
  description?: string | null;
}

export interface ChantierNote {
  id: string;
  contenu: string;
  created_at: string;
}

export interface Chantier {
  id: string;
  client_id: string;
  client: string;
  titre: string;
  description: string | null;
  adresse_chantier: string | null;
  status: ChantierStatus;
  progression: number;
  budget_prevu: number | null;
  budget_reel: number | null;
  date_debut: string | null;
  date_fin_prevue: string | null;
  date_fin_reelle: string | null;
  etapes: ChantierEtape[];
  notes: ChantierNote[];
  created_at: string;
}
