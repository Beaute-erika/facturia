-- Migration 006 : Features premium Chorus Pro
-- 1. auto_send_chorus sur les factures
-- 2. chorus_queue : envois asynchrones persistants
-- 3. notifications : alertes utilisateur Chorus

-- ── 1. Auto-envoi Chorus ──────────────────────────────────────────────────────

ALTER TABLE factures
  ADD COLUMN IF NOT EXISTS auto_send_chorus boolean NOT NULL DEFAULT false;

COMMENT ON COLUMN factures.auto_send_chorus IS
  'Si true (plan pro+), la facture est envoyée à Chorus automatiquement à l''envoi (status=envoyee)';

-- ── 2. Queue d'envoi Chorus ───────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS chorus_queue (
  id             uuid         DEFAULT gen_random_uuid() PRIMARY KEY,
  facture_id     uuid         NOT NULL REFERENCES factures(id) ON DELETE CASCADE,
  user_id        uuid         NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  status         text         NOT NULL DEFAULT 'pending'
    CONSTRAINT chorus_queue_status_check
    CHECK (status IN ('pending','processing','done','error')),
  error_message  text,
  retry_count    integer      NOT NULL DEFAULT 0
    CONSTRAINT chorus_queue_retry_pos CHECK (retry_count >= 0),
  created_at     timestamptz  NOT NULL DEFAULT now(),
  processed_at   timestamptz
);

-- Index pour le traitement efficace des items en attente
CREATE INDEX IF NOT EXISTS chorus_queue_pending_idx
  ON chorus_queue(status, created_at)
  WHERE status IN ('pending', 'error');

COMMENT ON TABLE chorus_queue IS 'Queue d''envoi Chorus Pro — traitée par le cron /api/cron/chorus';
COMMENT ON COLUMN chorus_queue.status IS 'pending → processing → done | error';

-- ── 3. Notifications utilisateur ─────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS notifications (
  id          uuid         DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id     uuid         NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type        text         NOT NULL,
  title       text         NOT NULL,
  message     text,
  data        jsonb,
  read        boolean      NOT NULL DEFAULT false,
  created_at  timestamptz  NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS notifications_user_unread_idx
  ON notifications(user_id, read, created_at DESC);

COMMENT ON TABLE notifications IS 'Notifications in-app — Chorus Pro, alertes factures';
