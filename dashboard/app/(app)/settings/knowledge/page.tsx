import { createServerClient } from "@/lib/supabase-server"
import { KnowledgeManager } from "@/components/knowledge-manager"
import type { KnowledgeFile } from "@/lib/types"

export const revalidate = 0

export default async function KnowledgePage() {
  const supabase = createServerClient()

  const { data } = await supabase
    .from("knowledge_files")
    .select("*")
    .order("created_at", { ascending: false })

  return <KnowledgeManager initialFiles={(data as KnowledgeFile[]) ?? []} />
}
