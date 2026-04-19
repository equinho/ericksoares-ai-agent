import { notFound } from "next/navigation"
import { createServerClient } from "@/lib/supabase-server"
import { ConversationList } from "@/components/conversation-list"
import { ConversationDetail } from "@/components/conversation-detail"
import type { Conversation, Message } from "@/lib/types"

export const revalidate = 0

export default async function ConversationPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const supabase = createServerClient()

  const [{ data: conversations }, { data: conversation }, { data: messages }] = await Promise.all([
    supabase
      .from("conversations")
      .select("*, messages(count)")
      .order("updated_at", { ascending: false }),
    supabase
      .from("conversations")
      .select("*")
      .eq("id", id)
      .single(),
    supabase
      .from("messages")
      .select("*")
      .eq("conversation_id", id)
      .order("created_at", { ascending: true }),
  ])

  if (!conversation) notFound()

  return (
    <>
      <aside className="w-72 shrink-0 border-r border-white/[0.06] flex flex-col">
        <div className="px-5 py-4 border-b border-white/[0.06]">
          <h1 className="text-sm font-semibold text-white/90">Conversas</h1>
          <p className="text-xs text-white/30 mt-0.5">{conversations?.length ?? 0} leads</p>
        </div>
        <ConversationList
          conversations={(conversations as Conversation[]) ?? []}
          selectedId={id}
        />
      </aside>
      <ConversationDetail
        conversation={conversation as Conversation}
        initialMessages={(messages as Message[]) ?? []}
      />
    </>
  )
}
