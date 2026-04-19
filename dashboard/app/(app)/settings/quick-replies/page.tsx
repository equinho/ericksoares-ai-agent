import { createServerClient } from "@/lib/supabase-server"
import { QuickRepliesManager } from "@/components/quick-replies-manager"
import type { QuickReply } from "@/lib/types"

export const revalidate = 0

export default async function QuickRepliesPage() {
  const supabase = createServerClient()

  const { data } = await supabase
    .from("quick_replies")
    .select("*")
    .order("created_at", { ascending: true })

  return <QuickRepliesManager initialReplies={(data as QuickReply[]) ?? []} />
}
