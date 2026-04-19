-- Tabela de configurações do agente (chave/valor)
CREATE TABLE IF NOT EXISTS agent_settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL DEFAULT '',
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE OR REPLACE TRIGGER update_agent_settings_updated_at
  BEFORE UPDATE ON agent_settings
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

ALTER TABLE agent_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role full access on agent_settings"
  ON agent_settings FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE POLICY "Anon read on agent_settings"
  ON agent_settings FOR SELECT TO anon USING (true);

-- Seed: prompt vazio (será preenchido pelo dashboard)
INSERT INTO agent_settings (key, value)
  VALUES ('system_prompt', '')
  ON CONFLICT (key) DO NOTHING;

-- Histórico de versões do prompt
CREATE TABLE IF NOT EXISTS prompt_history (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE prompt_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role full access on prompt_history"
  ON prompt_history FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE POLICY "Anon read on prompt_history"
  ON prompt_history FOR SELECT TO anon USING (true);
