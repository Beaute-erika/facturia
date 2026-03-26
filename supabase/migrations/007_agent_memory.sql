-- Migration 007: Agent IA memory — persistent conversations per CRM context

CREATE TABLE IF NOT EXISTS agent_conversations (
  id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  context_type TEXT        NOT NULL CHECK (context_type IN ('general','client','devis','facture','chantier')),
  context_id   TEXT        NOT NULL DEFAULT '',   -- empty string for 'general'
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user_id, context_type, context_id)
);

CREATE TABLE IF NOT EXISTS agent_messages (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID        NOT NULL REFERENCES agent_conversations(id) ON DELETE CASCADE,
  role            TEXT        NOT NULL CHECK (role IN ('user','assistant')),
  content         TEXT        NOT NULL,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS agent_messages_conv_created ON agent_messages(conversation_id, created_at DESC);

ALTER TABLE agent_conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE agent_messages      ENABLE ROW LEVEL SECURITY;

CREATE POLICY "owner_conversations" ON agent_conversations FOR ALL USING (user_id = auth.uid());

CREATE POLICY "owner_messages" ON agent_messages FOR ALL USING (
  conversation_id IN (SELECT id FROM agent_conversations WHERE user_id = auth.uid())
);

CREATE OR REPLACE FUNCTION touch_agent_conversation()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  UPDATE agent_conversations SET updated_at = NOW() WHERE id = NEW.conversation_id;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_touch_agent_conversation
AFTER INSERT ON agent_messages
FOR EACH ROW EXECUTE FUNCTION touch_agent_conversation();
