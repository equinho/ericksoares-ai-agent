"use client"

import { useEffect, useRef, useState } from "react"
import { supabaseBrowser } from "@/lib/supabase-browser"
import { formatTime, formatDate } from "@/lib/date"
import { ScrollArea } from "@/components/ui/scroll-area"
import type { Message } from "@/lib/types"

type Props = {
  conversationId: string
  initialMessages: Message[]
}

export function MessageThread({ conversationId, initialMessages }: Props) {
  const [messages, setMessages] = useState<Message[]>(initialMessages)
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages])

  useEffect(() => {
    const channel = supabaseBrowser
      .channel(`messages:${conversationId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "messages",
          filter: `conversation_id=eq.${conversationId}`,
        },
        (payload) => {
          setMessages((prev) => [...prev, payload.new as Message])
        }
      )
      .subscribe()

    return () => {
      supabaseBrowser.removeChannel(channel)
    }
  }, [conversationId])

  const grouped = groupByDate(messages)

  return (
    <ScrollArea className="flex-1">
      <div className="px-4 py-5 space-y-6">
        {messages.length === 0 && (
          <p className="text-center text-white/20 text-sm py-10">Nenhuma mensagem ainda</p>
        )}
        {grouped.map(({ date, msgs }) => (
          <div key={date}>
            {/* Date divider */}
            <div className="flex items-center gap-3 mb-4">
              <div className="flex-1 h-px bg-white/[0.06]" />
              <span className="text-[11px] text-white/25 font-medium">{date}</span>
              <div className="flex-1 h-px bg-white/[0.06]" />
            </div>
            <div className="space-y-1.5">
              {msgs.map((msg) => (
                <MessageBubble key={msg.id} message={msg} />
              ))}
            </div>
          </div>
        ))}
        <div ref={bottomRef} />
      </div>
    </ScrollArea>
  )
}

function MessageBubble({ message }: { message: Message }) {
  const isUser = message.role === "user"

  return (
    <div className={`flex ${isUser ? "justify-start" : "justify-end"}`}>
      <div
        className={`max-w-[74%] rounded-2xl px-4 py-2.5 ${
          isUser
            ? "bg-white/[0.07] ring-1 ring-white/[0.08] rounded-tl-sm"
            : "bg-white rounded-tr-sm shadow-sm"
        }`}
      >
        <p className={`text-sm whitespace-pre-wrap break-words leading-relaxed ${isUser ? "text-white/85" : "text-black"}`}>
          {message.content}
        </p>
        <p className={`text-[10px] mt-1.5 ${isUser ? "text-white/25" : "text-black/35"}`}>
          {formatTime(message.created_at)}
        </p>
      </div>
    </div>
  )
}

function groupByDate(messages: Message[]) {
  const groups: { date: string; msgs: Message[] }[] = []
  const seen = new Map<string, number>()
  for (const msg of messages) {
    const date = formatDate(msg.created_at)
    if (!seen.has(date)) {
      seen.set(date, groups.length)
      groups.push({ date, msgs: [] })
    }
    groups[seen.get(date)!].msgs.push(msg)
  }
  return groups
}
