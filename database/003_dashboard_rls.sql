-- =====================================================
-- WhatsApp AI Agent — Dashboard RLS Migration
-- Permite leitura anon (usada pelo dashboard via anon key)
-- Execute este script no Supabase SQL Editor
-- =====================================================

-- Leitura de conversations para anon (dashboard)
CREATE POLICY "Anon read access on conversations"
  ON conversations
  FOR SELECT
  TO anon
  USING (true);

-- Leitura de messages para anon (dashboard)
CREATE POLICY "Anon read access on messages"
  ON messages
  FOR SELECT
  TO anon
  USING (true);

-- Update de conversations para anon (mudar status, lead_name, notes)
CREATE POLICY "Anon update access on conversations"
  ON conversations
  FOR UPDATE
  TO anon
  USING (true)
  WITH CHECK (true);
