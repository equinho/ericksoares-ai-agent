-- =====================================================
-- WhatsApp AI Agent — Improvements Migration
-- Execute este script no Supabase SQL Editor
-- =====================================================

-- =====================================================
-- 1. RACE CONDITION — Índice único parcial
-- Garante que não existam duas conversas "active"
-- para o mesmo número ao mesmo tempo
-- =====================================================
CREATE UNIQUE INDEX IF NOT EXISTS idx_conversations_phone_active
  ON conversations (phone)
  WHERE status = 'active';

-- =====================================================
-- 2. DEDUPLICAÇÃO — Coluna zapi_message_id
-- Armazena o ID único da mensagem da Z-API para
-- evitar reprocessamento em caso de retry do webhook
-- =====================================================
ALTER TABLE messages
  ADD COLUMN IF NOT EXISTS zapi_message_id TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS idx_messages_zapi_message_id
  ON messages (zapi_message_id)
  WHERE zapi_message_id IS NOT NULL;
