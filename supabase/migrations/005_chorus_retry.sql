-- Migration 005 : Compteur de tentatives Chorus Pro
-- Permet de limiter les retries et de tracer l'historique des envois

ALTER TABLE factures
  ADD COLUMN IF NOT EXISTS chorus_retry_count integer NOT NULL DEFAULT 0
    CONSTRAINT factures_chorus_retry_pos CHECK (chorus_retry_count >= 0);

COMMENT ON COLUMN factures.chorus_retry_count IS 'Nombre de tentatives d''envoi Chorus Pro (0 = jamais envoyé)';
