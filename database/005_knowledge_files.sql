-- Arquivos da base de conhecimento do agente
CREATE TABLE IF NOT EXISTS knowledge_files (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  content TEXT NOT NULL,
  file_size INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE knowledge_files ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role full access on knowledge_files"
  ON knowledge_files FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE POLICY "Anon read on knowledge_files"
  ON knowledge_files FOR SELECT TO anon USING (true);
