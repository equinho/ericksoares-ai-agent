"use client"

import { useState, useTransition } from "react"
import { ScrollArea } from "@/components/ui/scroll-area"
import { MessageThread } from "./message-thread"
import { StatusBadge } from "./status-badge"
import { updateConversationStatus, updateConversationMeta } from "@/lib/actions"
import { Check, X } from "lucide-react"
import type { Conversation, Message, ConversationStatus } from "@/lib/types"

type Props = {
  conversation: Conversation
  initialMessages: Message[]
}

const statusOptions: ConversationStatus[] = ["active", "scheduled", "closed"]
const statusLabels: Record<ConversationStatus, string> = {
  active: "Ativo",
  scheduled: "Agendado",
  closed: "Fechado",
}

export function ConversationDetail({ conversation, initialMessages }: Props) {
  const [leadName, setLeadName] = useState(conversation.lead_name ?? "")
  const [notes, setNotes] = useState(conversation.notes ?? "")
  const [editingName, setEditingName] = useState(false)
  const [editingNotes, setEditingNotes] = useState(false)
  const [isPending, startTransition] = useTransition()

  function handleStatusChange(status: ConversationStatus) {
    startTransition(() => updateConversationStatus(conversation.id, status))
  }

  function handleSaveName() {
    startTransition(async () => {
      await updateConversationMeta(conversation.id, { lead_name: leadName || null })
      setEditingName(false)
    })
  }

  function handleSaveNotes() {
    startTransition(async () => {
      await updateConversationMeta(conversation.id, { notes: notes || null })
      setEditingNotes(false)
    })
  }

  return (
    <main className="flex-1 flex min-w-0">
      {/* Thread */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Header */}
        <div className="px-5 py-3.5 border-b border-white/[0.06] flex items-center gap-3">
          <div className="min-w-0 flex-1">
            <h2 className="font-semibold text-white/90 truncate text-sm">
              {conversation.lead_name ?? conversation.phone}
            </h2>
            {conversation.lead_name && (
              <p className="text-xs text-white/30 mt-0.5">{conversation.phone}</p>
            )}
          </div>
          <StatusBadge status={conversation.status} />
        </div>
        <MessageThread conversationId={conversation.id} initialMessages={initialMessages} />
      </div>

      {/* Side panel */}
      <aside className="w-60 shrink-0 border-l border-white/[0.06] flex flex-col overflow-hidden">
        {/* Lead section */}
        <div className="p-4 border-b border-white/[0.06]">
          <p className="text-[10px] font-semibold text-white/25 uppercase tracking-widest mb-3">Lead</p>

          {/* Name */}
          <div className="mb-3">
            <p className="text-[10px] text-white/30 mb-1.5">Nome</p>
            {editingName ? (
              <div className="flex gap-1">
                <input
                  value={leadName}
                  onChange={(e) => setLeadName(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleSaveName()}
                  autoFocus
                  className="flex-1 h-7 text-xs bg-white/[0.06] border border-white/[0.10] rounded-lg px-2 text-white/90 outline-none focus:border-white/25 transition-colors"
                />
                <button onClick={handleSaveName} disabled={isPending} className="w-7 h-7 rounded-lg bg-white/[0.08] hover:bg-white/[0.14] flex items-center justify-center text-white/70 transition-colors">
                  <Check className="w-3 h-3" />
                </button>
                <button onClick={() => setEditingName(false)} className="w-7 h-7 rounded-lg hover:bg-white/[0.06] flex items-center justify-center text-white/40 transition-colors">
                  <X className="w-3 h-3" />
                </button>
              </div>
            ) : (
              <button
                onClick={() => setEditingName(true)}
                className="text-sm text-left w-full text-white/80 hover:text-white transition-colors"
              >
                {leadName || <span className="text-white/20 italic text-xs">Adicionar nome</span>}
              </button>
            )}
          </div>

          {/* Phone */}
          <div>
            <p className="text-[10px] text-white/30 mb-1">Telefone</p>
            <p className="text-sm text-white/70 font-mono">{conversation.phone}</p>
          </div>
        </div>

        {/* Status section */}
        <div className="p-4 border-b border-white/[0.06]">
          <p className="text-[10px] font-semibold text-white/25 uppercase tracking-widest mb-3">Status</p>
          <div className="flex flex-col gap-0.5">
            {statusOptions.map((s) => (
              <button
                key={s}
                onClick={() => handleStatusChange(s)}
                disabled={isPending || conversation.status === s}
                className={`text-left text-sm px-3 py-1.5 rounded-lg transition-all duration-150 ${
                  conversation.status === s
                    ? "bg-white/[0.08] text-white/90 ring-1 ring-white/[0.10]"
                    : "text-white/35 hover:text-white/80 hover:bg-white/[0.05]"
                }`}
              >
                {statusLabels[s]}
              </button>
            ))}
          </div>
        </div>

        {/* Notes section */}
        <div className="p-4 flex-1 flex flex-col">
          <p className="text-[10px] font-semibold text-white/25 uppercase tracking-widest mb-3">Notas</p>
          {editingNotes ? (
            <div className="flex flex-col gap-2 flex-1">
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                autoFocus
                className="flex-1 text-xs bg-white/[0.05] border border-white/[0.10] rounded-xl p-3 text-white/85 placeholder:text-white/20 resize-none outline-none focus:border-white/25 transition-colors min-h-[80px] leading-relaxed"
              />
              <div className="flex gap-1.5">
                <button onClick={handleSaveNotes} disabled={isPending} className="flex-1 h-7 text-xs rounded-lg bg-white/[0.09] hover:bg-white/[0.14] text-white/80 transition-colors font-medium">
                  Salvar
                </button>
                <button
                  onClick={() => { setNotes(conversation.notes ?? ""); setEditingNotes(false) }}
                  className="px-3 h-7 text-xs rounded-lg text-white/35 hover:text-white/70 hover:bg-white/[0.05] transition-colors"
                >
                  Cancelar
                </button>
              </div>
            </div>
          ) : (
            <button
              onClick={() => setEditingNotes(true)}
              className="text-sm text-left w-full text-white/70 hover:text-white/90 transition-colors leading-relaxed"
            >
              {notes || <span className="text-white/20 italic text-xs">Adicionar notas...</span>}
            </button>
          )}
        </div>
      </aside>
    </main>
  )
}
