"use client"

import Link from "next/link"
import { formatDistanceToNow } from "@/lib/date"
import { StatusBadge } from "./status-badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import type { Conversation } from "@/lib/types"

type Props = {
  conversations: Conversation[]
  selectedId: string | null
}

function getInitials(leadName: string | null, phone: string) {
  if (leadName) {
    const parts = leadName.trim().split(" ")
    if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase()
    return leadName.slice(0, 2).toUpperCase()
  }
  return phone.replace(/\D/g, "").slice(-2)
}

const avatarColors = [
  "bg-violet-500/20 text-violet-300",
  "bg-blue-500/20 text-blue-300",
  "bg-cyan-500/20 text-cyan-300",
  "bg-emerald-500/20 text-emerald-300",
  "bg-amber-500/20 text-amber-300",
  "bg-rose-500/20 text-rose-300",
]

function getAvatarColor(id: string) {
  const sum = id.split("").reduce((acc, c) => acc + c.charCodeAt(0), 0)
  return avatarColors[sum % avatarColors.length]
}

export function ConversationList({ conversations, selectedId }: Props) {
  return (
    <ScrollArea className="flex-1">
      <div className="p-2 space-y-0.5">
        {conversations.length === 0 && (
          <p className="text-center text-white/20 text-xs py-10">Nenhuma conversa ainda</p>
        )}
        {conversations.map((conv) => {
          const isSelected = conv.id === selectedId
          const msgCount = (conv.messages as { count: number }[] | undefined)?.[0]?.count ?? 0
          const initials = getInitials(conv.lead_name, conv.phone)
          const avatarColor = getAvatarColor(conv.id)

          return (
            <Link
              key={conv.id}
              href={`/conversations/${conv.id}`}
              className={`flex items-center gap-3 rounded-xl px-3 py-2.5 transition-all duration-150 group ${
                isSelected
                  ? "bg-white/[0.09] ring-1 ring-white/[0.10]"
                  : "hover:bg-white/[0.05]"
              }`}
            >
              {/* Avatar */}
              <div className={`w-9 h-9 rounded-xl shrink-0 flex items-center justify-center text-xs font-semibold ${avatarColor}`}>
                {initials}
              </div>

              {/* Info */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-1 mb-0.5">
                  <span className="text-sm font-medium text-white/85 truncate leading-tight">
                    {conv.lead_name ?? conv.phone}
                  </span>
                  <span className="text-[10px] text-white/25 shrink-0 tabular-nums">
                    {formatDistanceToNow(conv.updated_at)}
                  </span>
                </div>
                <div className="flex items-center justify-between gap-1">
                  {conv.lead_name && (
                    <span className="text-[11px] text-white/30 truncate">{conv.phone}</span>
                  )}
                  {!conv.lead_name && (
                    <span className="text-[11px] text-white/30">{msgCount} msgs</span>
                  )}
                  <StatusBadge status={conv.status} />
                </div>
              </div>
            </Link>
          )
        })}
      </div>
    </ScrollArea>
  )
}
