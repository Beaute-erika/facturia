-- Migration 003: Champs de facturation avancés
-- Ajoute remise, acompte, conditions de paiement sur devis et factures

ALTER TABLE devis
  ADD COLUMN IF NOT EXISTS conditions_paiement text,
  ADD COLUMN IF NOT EXISTS remise_percent     numeric(5,2)  NOT NULL DEFAULT 0
    CONSTRAINT devis_remise_range CHECK (remise_percent >= 0 AND remise_percent <= 100),
  ADD COLUMN IF NOT EXISTS acompte            numeric(10,2) NOT NULL DEFAULT 0
    CONSTRAINT devis_acompte_pos  CHECK (acompte >= 0);

ALTER TABLE factures
  ADD COLUMN IF NOT EXISTS conditions_paiement text,
  ADD COLUMN IF NOT EXISTS remise_percent     numeric(5,2)  NOT NULL DEFAULT 0
    CONSTRAINT factures_remise_range CHECK (remise_percent >= 0 AND remise_percent <= 100),
  ADD COLUMN IF NOT EXISTS acompte            numeric(10,2) NOT NULL DEFAULT 0
    CONSTRAINT factures_acompte_pos  CHECK (acompte >= 0);

-- Commentaires
COMMENT ON COLUMN devis.remise_percent      IS 'Remise globale en % appliquée sur le total HT brut';
COMMENT ON COLUMN devis.acompte             IS 'Acompte déjà versé (€) — déduit du TTC pour le restant à payer';
COMMENT ON COLUMN devis.conditions_paiement IS 'Conditions de paiement affichées sur le document';

COMMENT ON COLUMN factures.remise_percent      IS 'Remise globale en % appliquée sur le total HT brut';
COMMENT ON COLUMN factures.acompte             IS 'Acompte déjà versé (€) — déduit du TTC pour le restant à payer';
COMMENT ON COLUMN factures.conditions_paiement IS 'Conditions de paiement affichées sur la facture';
