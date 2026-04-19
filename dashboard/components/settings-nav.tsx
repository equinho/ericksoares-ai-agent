"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { FileText, BookOpen, Zap } from "lucide-react"

const items = [
  { href: "/settings/prompt",       icon: FileText, label: "Prompt",           desc: "Comportamento e personalidade" },
  { href: "/settings/knowledge",    icon: BookOpen, label: "Conhecimento",      desc: "Arquivos de referência" },
  { href: "/settings/quick-replies", icon: Zap,     label: "Respostas Rápidas", desc: "Templates de mensagem" },
]

export function SettingsNav() {
  const pathname = usePathname()

  return (
    <aside className="w-52 shrink-0 border-r border-white/[0.06] flex flex-col py-3">
      <p className="text-[10px] font-semibold text-white/25 uppercase tracking-widest px-5 mb-3">
        Configurações
      </p>
      <nav className="px-2 space-y-0.5">
        {items.map(({ href, icon: Icon, label, desc }) => {
          const isActive = pathname === href
          return (
            <Link
              key={href}
              href={href}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-150 group ${
                isActive
                  ? "bg-white/[0.08] ring-1 ring-white/[0.10]"
                  : "hover:bg-white/[0.05]"
              }`}
            >
              <Icon
                className={`w-4 h-4 shrink-0 transition-colors ${
                  isActive ? "text-green-400" : "text-white/30 group-hover:text-white/60"
                }`}
                strokeWidth={isActive ? 2 : 1.7}
              />
              <div className="min-w-0">
                <p className={`text-sm leading-tight truncate transition-colors ${isActive ? "text-white/90 font-medium" : "text-white/50 group-hover:text-white/80"}`}>
                  {label}
                </p>
                <p className="text-[10px] text-white/25 truncate mt-0.5">{desc}</p>
              </div>
            </Link>
          )
        })}
      </nav>
    </aside>
  )
}
