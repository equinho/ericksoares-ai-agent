import type { ConversationStatus } from "@/lib/types"

const config: Record<ConversationStatus, { label: string; dot: string; text: string }> = {
  active:    { label: "Ativo",     dot: "bg-green-400",  text: "text-green-400" },
  scheduled: { label: "Agendado",  dot: "bg-blue-400",   text: "text-blue-400" },
  closed:    { label: "Fechado",   dot: "bg-white/25",   text: "text-white/40" },
}

export function StatusBadge({ status }: { status: ConversationStatus }) {
  const { label, dot, text } = config[status] ?? config.active
  return (
    <span className="inline-flex items-center gap-1.5 shrink-0">
      <span className={`w-1.5 h-1.5 rounded-full ${dot}`} />
      <span className={`text-[10px] font-medium ${text}`}>{label}</span>
    </span>
  )
}
