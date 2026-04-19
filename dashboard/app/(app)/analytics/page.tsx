import { createServerClient } from "@/lib/supabase-server"
import { TrendingUp, MessageSquare, Users, CheckCircle } from "lucide-react"

export const revalidate = 0

function buildChartData(messages: { created_at: string }[]) {
  const days: { date: string; label: string; count: number }[] = []
  for (let i = 13; i >= 0; i--) {
    const d = new Date()
    d.setDate(d.getDate() - i)
    const date = d.toISOString().split("T")[0]
    const label = String(d.getDate()).padStart(2, "0") + "/" + String(d.getMonth() + 1).padStart(2, "0")
    days.push({ date, label, count: 0 })
  }
  for (const msg of messages) {
    const date = msg.created_at.split("T")[0]
    const entry = days.find((d) => d.date === date)
    if (entry) entry.count++
  }
  return days
}

export default async function AnalyticsPage() {
  const supabase = createServerClient()

  const cutoff14d = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString()
  const todayStr = new Date().toISOString().split("T")[0]
  const yesterdayStr = new Date(Date.now() - 86400000).toISOString().split("T")[0]

  const [
    { count: totalConvs },
    { count: activeConvs },
    { count: closedConvs },
    { data: recentMsgs },
    { count: totalMsgs },
  ] = await Promise.all([
    supabase.from("conversations").select("*", { count: "exact", head: true }),
    supabase.from("conversations").select("*", { count: "exact", head: true }).eq("status", "active"),
    supabase.from("conversations").select("*", { count: "exact", head: true }).eq("status", "closed"),
    supabase.from("messages").select("created_at").gte("created_at", cutoff14d),
    supabase.from("messages").select("*", { count: "exact", head: true }),
  ])

  const msgs = recentMsgs ?? []
  const msgsToday = msgs.filter((m) => m.created_at.startsWith(todayStr)).length
  const msgsYesterday = msgs.filter((m) => m.created_at.startsWith(yesterdayStr)).length
  const chartData = buildChartData(msgs)
  const maxCount = Math.max(...chartData.map((d) => d.count), 1)

  const stats = [
    { label: "Total de leads",     value: totalConvs ?? 0,  icon: Users,        color: "text-blue-400",   glow: "shadow-[0_0_20px_rgba(96,165,250,0.15)]",  bg: "bg-blue-500/[0.12]"  },
    { label: "Conversas ativas",   value: activeConvs ?? 0, icon: MessageSquare, color: "text-green-400",  glow: "shadow-[0_0_20px_rgba(74,222,128,0.15)]",  bg: "bg-green-500/[0.12]" },
    { label: "Fechadas",           value: closedConvs ?? 0, icon: CheckCircle,   color: "text-white/50",   glow: "",                                          bg: "bg-white/[0.07]"     },
    { label: "Mensagens hoje",     value: msgsToday,        icon: TrendingUp,    color: "text-amber-400",  glow: "shadow-[0_0_20px_rgba(251,191,36,0.12)]",  bg: "bg-amber-500/[0.12]",
      sub: msgsYesterday > 0 ? `${msgsYesterday} ontem` : undefined },
  ]

  return (
    <div className="flex-1 flex flex-col min-h-0 overflow-y-auto">
      {/* Header */}
      <div className="px-7 py-5 border-b border-white/[0.06]">
        <h1 className="text-base font-semibold text-white/90">Analytics</h1>
        <p className="text-xs text-white/30 mt-0.5">Visão geral do agente</p>
      </div>

      <div className="p-7 space-y-6 max-w-3xl">
        {/* Stat cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {stats.map(({ label, value, sub, icon: Icon, color, glow, bg }) => (
            <div
              key={label}
              className="bg-white/[0.03] border border-white/[0.07] hover:border-white/[0.12] rounded-2xl p-4 flex flex-col gap-3.5 transition-all duration-200 hover:bg-white/[0.05]"
            >
              <div className={`w-9 h-9 rounded-xl ${bg} ${glow} flex items-center justify-center`}>
                <Icon className={`w-4 h-4 ${color}`} strokeWidth={1.8} />
              </div>
              <div>
                <p className="text-2xl font-semibold text-white/90 tabular-nums">
                  {value.toLocaleString("pt-BR")}
                </p>
                <p className="text-xs text-white/35 mt-0.5">{label}</p>
                {sub && <p className="text-[10px] text-white/20 mt-1">{sub}</p>}
              </div>
            </div>
          ))}
        </div>

        {/* Bar chart */}
        <div className="bg-white/[0.03] border border-white/[0.07] rounded-2xl p-6">
          <div className="flex items-baseline justify-between mb-1">
            <p className="text-sm font-medium text-white/80">Mensagens por dia</p>
            <p className="text-xs text-white/25 tabular-nums">
              total {(totalMsgs ?? 0).toLocaleString("pt-BR")}
            </p>
          </div>
          <p className="text-xs text-white/25 mb-6">
            {msgs.length} mensagens nos últimos 14 dias
          </p>

          <div className="flex items-end gap-1.5" style={{ height: "110px" }}>
            {chartData.map(({ date, label, count }) => {
              const heightPct = count === 0 ? 0 : Math.max((count / maxCount) * 100, 5)
              const isToday = date === todayStr
              return (
                <div key={date} className="flex-1 flex flex-col items-center gap-1.5 group">
                  <div className="w-full flex flex-col justify-end" style={{ height: "90px" }}>
                    <div
                      className={`w-full rounded-t transition-all duration-300 ${
                        isToday
                          ? "bg-green-400 shadow-[0_0_12px_rgba(74,222,128,0.35)]"
                          : "bg-white/[0.12] group-hover:bg-white/[0.22]"
                      }`}
                      style={{ height: count === 0 ? "2px" : `${heightPct}%` }}
                      title={`${label}: ${count}`}
                    />
                  </div>
                  <span className={`text-[9px] tabular-nums ${isToday ? "text-green-400 font-semibold" : "text-white/20"}`}>
                    {label}
                  </span>
                </div>
              )
            })}
          </div>

          <div className="flex items-center gap-5 mt-5 pt-4 border-t border-white/[0.06]">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-sm bg-green-400 shadow-[0_0_8px_rgba(74,222,128,0.5)]" />
              <span className="text-xs text-white/30">Hoje</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-sm bg-white/[0.14]" />
              <span className="text-xs text-white/30">Outros dias</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
