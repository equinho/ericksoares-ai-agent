import { createServerClient } from "@/lib/supabase-server"
import { ConversationList } from "@/components/conversation-list"
import type { Conversation } from "@/lib/types"

export const revalidate = 0

export default async function ConversationsPage() {
  const supabase = createServerClient()

  const { data: conversations } = await supabase
    .from("conversations")
    .select("*, messages(count)")
    .order("updated_at", { ascending: false })

  return (
    <>
      <aside className="w-72 shrink-0 border-r border-white/[0.06] flex flex-col">
        <div className="px-5 py-4 border-b border-white/[0.06]">
          <h1 className="text-sm font-semibold text-white/90">Conversas</h1>
          <p className="text-xs text-white/30 mt-0.5">{conversations?.length ?? 0} leads</p>
        </div>
        <ConversationList conversations={(conversations as Conversation[]) ?? []} selectedId={null} />
      </aside>
      <main className="flex-1 flex items-center justify-center">
        <div className="text-center">
          <p className="text-white/20 text-sm">Selecione uma conversa</p>
        </div>
      </main>
    </>
  )
}
