"use server"

import { revalidatePath } from "next/cache"
import { createServerClient } from "./supabase-server"
import type { ConversationStatus } from "./types"

// ─── Conversations ───────────────────────────────────────────────────

export async function updateConversationStatus(id: string, status: ConversationStatus) {
  const supabase = createServerClient()
  const { error } = await supabase
    .from("conversations")
    .update({ status })
    .eq("id", id)

  if (error) throw new Error(error.message)
  revalidatePath("/conversations")
  revalidatePath(`/conversations/${id}`)
}

export async function updateConversationMeta(
  id: string,
  data: { lead_name?: string | null; notes?: string | null }
) {
  const supabase = createServerClient()
  const { error } = await supabase
    .from("conversations")
    .update(data)
    .eq("id", id)

  if (error) throw new Error(error.message)
  revalidatePath("/conversations")
  revalidatePath(`/conversations/${id}`)
}

// ─── Prompt ─────────────────────────────────────────────────────────

export async function saveSystemPrompt(content: string) {
  const supabase = createServerClient()

  // Salva versão atual no histórico antes de sobrescrever
  const { data: current } = await supabase
    .from("agent_settings")
    .select("value")
    .eq("key", "system_prompt")
    .maybeSingle()

  if (current?.value?.trim() && current.value !== content) {
    await supabase.from("prompt_history").insert({ content: current.value })
  }

  const { error } = await supabase
    .from("agent_settings")
    .upsert({ key: "system_prompt", value: content })

  if (error) throw new Error(error.message)
  revalidatePath("/settings/prompt")
}

// ─── Knowledge Files ─────────────────────────────────────────────────

export async function saveKnowledgeFile(name: string, content: string, fileSize: number) {
  const supabase = createServerClient()
  const { error } = await supabase
    .from("knowledge_files")
    .insert({ name, content, file_size: fileSize })

  if (error) throw new Error(error.message)
  revalidatePath("/settings/knowledge")
}

export async function deleteKnowledgeFile(id: string) {
  const supabase = createServerClient()
  const { error } = await supabase
    .from("knowledge_files")
    .delete()
    .eq("id", id)

  if (error) throw new Error(error.message)
  revalidatePath("/settings/knowledge")
}

// ─── Quick Replies ────────────────────────────────────────────────────

export async function saveQuickReply(title: string, content: string) {
  const supabase = createServerClient()
  const { error } = await supabase.from("quick_replies").insert({ title, content })

  if (error) throw new Error(error.message)
  revalidatePath("/settings/quick-replies")
}

export async function updateQuickReply(id: string, title: string, content: string) {
  const supabase = createServerClient()
  const { error } = await supabase
    .from("quick_replies")
    .update({ title, content })
    .eq("id", id)

  if (error) throw new Error(error.message)
  revalidatePath("/settings/quick-replies")
}

export async function deleteQuickReply(id: string) {
  const supabase = createServerClient()
  const { error } = await supabase.from("quick_replies").delete().eq("id", id)

  if (error) throw new Error(error.message)
  revalidatePath("/settings/quick-replies")
}
