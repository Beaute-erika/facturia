-- Migration 004 : Suivi statut Chorus Pro
-- Ajoute les colonnes de traçabilité après dépôt sur Chorus Pro (PISTE)

ALTER TABLE factures
  ADD COLUMN IF NOT EXISTS chorus_status text
    CONSTRAINT factures_chorus_status_check
    CHECK (chorus_status IN ('depose','en_traitement','acceptee','rejetee')),
  ADD COLUMN IF NOT EXISTS chorus_depot_id text,
  ADD COLUMN IF NOT EXISTS chorus_last_error text;

COMMENT ON COLUMN factures.chorus_status   IS 'Statut Chorus Pro : depose | en_traitement | acceptee | rejetee';
COMMENT ON COLUMN factures.chorus_depot_id IS 'Identifiant de dépôt retourné par Chorus Pro (idFactureCPP)';
COMMENT ON COLUMN factures.chorus_last_error IS 'Dernier message d''erreur Chorus Pro pour affichage et retry';
