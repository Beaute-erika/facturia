-- ─── Services / Produits ───────────────────────────────────────────────────
-- Migration 008 : table services + RLS

CREATE TABLE IF NOT EXISTS services (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name        TEXT NOT NULL,
  description TEXT,
  price_ht    NUMERIC(12, 2) NOT NULL DEFAULT 0,
  category    TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Auto-update updated_at
CREATE OR REPLACE TRIGGER set_services_updated_at
  BEFORE UPDATE ON services
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Indexes
CREATE INDEX IF NOT EXISTS services_user_id_idx ON services (user_id);

-- RLS
ALTER TABLE services ENABLE ROW LEVEL SECURITY;

CREATE POLICY "services_select" ON services
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "services_insert" ON services
  FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY "services_update" ON services
  FOR UPDATE USING (user_id = auth.uid());

CREATE POLICY "services_delete" ON services
  FOR DELETE USING (user_id = auth.uid());
