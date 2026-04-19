-- Templates de resposta rápida para uso manual no dashboard
CREATE TABLE IF NOT EXISTS quick_replies (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE quick_replies ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role full access on quick_replies"
  ON quick_replies FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE POLICY "Anon read on quick_replies"
  ON quick_replies FOR SELECT TO anon USING (true);
