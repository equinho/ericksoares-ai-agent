"use client"

import { useState, useTransition } from "react"
import { Plus, Pencil, Trash2, Check, X, Zap } from "lucide-react"
import { saveQuickReply, updateQuickReply, deleteQuickReply } from "@/lib/actions"
import type { QuickReply } from "@/lib/types"

type Props = {
  initialReplies: QuickReply[]
}

export function QuickRepliesManager({ initialReplies }: Props) {
  const [replies, setReplies] = useState<QuickReply[]>(initialReplies)
  const [adding, setAdding] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  function handleAdded(reply: QuickReply) {
    setReplies((prev) => [...prev, reply])
    setAdding(false)
  }

  function handleUpdated(id: string, title: string, content: string) {
    setReplies((prev) => prev.map((r) => (r.id === id ? { ...r, title, content } : r)))
    setEditingId(null)
  }

  function handleDelete(id: string) {
    startTransition(async () => {
      await deleteQuickReply(id)
      setReplies((prev) => prev.filter((r) => r.id !== id))
    })
  }

  return (
    <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-7 py-4 border-b border-white/[0.06] shrink-0">
        <div>
          <h2 className="text-sm font-semibold text-white/90">Respostas Rápidas</h2>
          <p className="text-xs text-white/30 mt-0.5">Templates para uso manual durante o atendimento</p>
        </div>
        <button
          onClick={() => { setAdding(true); setEditingId(null) }}
          className="flex items-center gap-1.5 text-sm px-4 py-1.5 rounded-xl bg-white text-black font-medium hover:bg-white/90 active:scale-95 transition-all duration-150"
        >
          <Plus className="w-3.5 h-3.5" strokeWidth={2.5} />
          Adicionar
        </button>
      </div>

      {/* Body */}
      <div className="flex-1 overflow-y-auto p-6">
        <div className="max-w-2xl space-y-2.5">
          {/* Add form */}
          {adding && (
            <ReplyForm
              onSave={async (title, content) => {
                await saveQuickReply(title, content)
                handleAdded({ id: crypto.randomUUID(), title, content, created_at: new Date().toISOString() })
              }}
              onCancel={() => setAdding(false)}
              autoFocus
            />
          )}

          {/* Empty state */}
          {replies.length === 0 && !adding && (
            <div className="flex flex-col items-center justify-center py-16 gap-4 text-center">
              <div className="w-14 h-14 rounded-2xl bg-white/[0.05] ring-1 ring-white/[0.08] flex items-center justify-center">
                <Zap className="w-6 h-6 text-white/20" strokeWidth={1.5} />
              </div>
              <div>
                <p className="text-sm text-white/40">Nenhuma resposta rápida</p>
                <p className="text-xs text-white/20 mt-1">Crie templates para agilizar o atendimento</p>
              </div>
            </div>
          )}

          {/* List */}
          {replies.map((reply) =>
            editingId === reply.id ? (
              <ReplyForm
                key={reply.id}
                initialTitle={reply.title}
                initialContent={reply.content}
                onSave={async (title, content) => {
                  await updateQuickReply(reply.id, title, content)
                  handleUpdated(reply.id, title, content)
                }}
                onCancel={() => setEditingId(null)}
                autoFocus
              />
            ) : (
              <ReplyCard
                key={reply.id}
                reply={reply}
                onEdit={() => { setEditingId(reply.id); setAdding(false) }}
                onDelete={() => handleDelete(reply.id)}
                isPending={isPending}
              />
            )
          )}
        </div>
      </div>
    </div>
  )
}

function ReplyCard({ reply, onEdit, onDelete, isPending }: {
  reply: QuickReply
  onEdit: () => void
  onDelete: () => void
  isPending: boolean
}) {
  return (
    <div className="group border border-white/[0.07] bg-white/[0.02] hover:bg-white/[0.05] hover:border-white/[0.12] rounded-2xl p-4 transition-all duration-150">
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-white/80 mb-1.5">{reply.title}</p>
          <p className="text-xs text-white/35 leading-relaxed line-clamp-3">{reply.content}</p>
        </div>
        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0 mt-0.5">
          <button
            onClick={onEdit}
            className="w-7 h-7 rounded-lg flex items-center justify-center text-white/30 hover:text-white/80 hover:bg-white/[0.08] transition-all"
          >
            <Pencil className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={onDelete}
            disabled={isPending}
            className="w-7 h-7 rounded-lg flex items-center justify-center text-white/30 hover:text-red-400 hover:bg-red-400/[0.08] transition-all"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  )
}

function ReplyForm({ initialTitle = "", initialContent = "", onSave, onCancel, autoFocus }: {
  initialTitle?: string
  initialContent?: string
  onSave: (title: string, content: string) => Promise<void>
  onCancel: () => void
  autoFocus?: boolean
}) {
  const [title, setTitle] = useState(initialTitle)
  const [content, setContent] = useState(initialContent)
  const [isPending, startTransition] = useTransition()

  function handleSave() {
    if (!title.trim() || !content.trim()) return
    startTransition(() => onSave(title.trim(), content.trim()))
  }

  return (
    <div className="border border-white/[0.10] bg-white/[0.04] rounded-2xl p-4 space-y-3">
      <input
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder="Título (ex: Saudação inicial)"
        className="w-full bg-white/[0.05] border border-white/[0.08] rounded-xl px-3.5 py-2.5 text-sm text-white/85 placeholder:text-white/20 outline-none focus:border-white/25 transition-colors"
        autoFocus={autoFocus}
        onKeyDown={(e) => e.key === "Enter" && handleSave()}
      />
      <textarea
        value={content}
        onChange={(e) => setContent(e.target.value)}
        placeholder="Conteúdo da resposta..."
        rows={3}
        className="w-full bg-white/[0.05] border border-white/[0.08] rounded-xl px-3.5 py-2.5 text-sm text-white/85 placeholder:text-white/20 outline-none focus:border-white/25 transition-colors resize-none leading-relaxed"
      />
      <div className="flex gap-2">
        <button
          onClick={handleSave}
          disabled={!title.trim() || !content.trim() || isPending}
          className="flex items-center gap-1.5 px-4 py-1.5 rounded-xl bg-white text-black text-sm font-medium hover:bg-white/90 active:scale-95 transition-all disabled:opacity-30 disabled:cursor-not-allowed"
        >
          <Check className="w-3.5 h-3.5" strokeWidth={2.5} />
          {isPending ? "Salvando..." : "Salvar"}
        </button>
        <button
          onClick={onCancel}
          disabled={isPending}
          className="flex items-center gap-1 px-3 py-1.5 rounded-xl text-sm text-white/35 hover:text-white/70 hover:bg-white/[0.05] transition-all"
        >
          <X className="w-3.5 h-3.5" />
          Cancelar
        </button>
      </div>
    </div>
  )
}
