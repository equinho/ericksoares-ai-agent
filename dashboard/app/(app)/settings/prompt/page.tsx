import { createServerClient } from "@/lib/supabase-server"
import { PromptEditor } from "@/components/prompt-editor"
import type { PromptVersion } from "@/lib/types"

export const revalidate = 0

export default async function PromptPage() {
  const supabase = createServerClient()

  const [{ data: setting }, { data: history }] = await Promise.all([
    supabase
      .from("agent_settings")
      .select("value")
      .eq("key", "system_prompt")
      .maybeSingle(),
    supabase
      .from("prompt_history")
      .select("id, content, created_at")
      .order("created_at", { ascending: false })
      .limit(10),
  ])

  return (
    <PromptEditor
      initialPrompt={setting?.value ?? ""}
      history={(history as PromptVersion[]) ?? []}
    />
  )
}
