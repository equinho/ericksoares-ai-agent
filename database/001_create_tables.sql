-- =====================================================
-- WhatsApp AI Agent — Database Schema
-- Execute este script no Supabase SQL Editor
-- =====================================================

-- =====================================================
-- 1. TABELA: conversations
-- Armazena cada conversa única por número de telefone
-- =====================================================
CREATE TABLE IF NOT EXISTS conversations (
  id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  phone      TEXT        NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  status     TEXT        DEFAULT 'active'
                         CHECK (status IN ('active', 'scheduled', 'closed')),
  lead_name  TEXT,
  notes      TEXT
);

-- Índice para busca rápida por telefone
CREATE INDEX IF NOT EXISTS idx_conversations_phone
  ON conversations (phone);

-- =====================================================
-- 2. TABELA: messages
-- Armazena o histórico de mensagens de cada conversa
-- =====================================================
CREATE TABLE IF NOT EXISTS messages (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID        NOT NULL
                              REFERENCES conversations (id)
                              ON DELETE CASCADE,
  role            TEXT        NOT NULL
                              CHECK (role IN ('user', 'assistant')),
  content         TEXT        NOT NULL,
  created_at      TIMESTAMPTZ DEFAULT now()
);

-- Índice para busca rápida por conversation_id
CREATE INDEX IF NOT EXISTS idx_messages_conversation_id
  ON messages (conversation_id);

-- =====================================================
-- 3. ROW LEVEL SECURITY (RLS)
-- Habilitado nas duas tabelas com policy permissiva
-- para service_role (usado pela Edge Function)
-- =====================================================

-- Habilitar RLS
ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages      ENABLE ROW LEVEL SECURITY;

-- Policy permissiva para service_role na tabela conversations
CREATE POLICY "Service role full access on conversations"
  ON conversations
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Policy permissiva para service_role na tabela messages
CREATE POLICY "Service role full access on messages"
  ON messages
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- =====================================================
-- 4. FUNCTION: auto-update updated_at
-- Atualiza automaticamente o campo updated_at
-- sempre que a row de conversations for modificada
-- =====================================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_conversations_updated_at
  BEFORE UPDATE ON conversations
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
