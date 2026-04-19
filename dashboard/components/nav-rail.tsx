"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { MessageSquare, BarChart3, Settings2, Bot } from "lucide-react"

const items = [
  { href: "/conversations", match: "/conversations", icon: MessageSquare, label: "Conversas" },
  { href: "/analytics", match: "/analytics", icon: BarChart3, label: "Analytics" },
  { href: "/settings/prompt", match: "/settings", icon: Settings2, label: "Configurações" },
]

export function NavRail() {
  const pathname = usePathname()

  return (
    <nav className="relative z-10 w-[68px] shrink-0 flex flex-col items-center py-5 gap-1 border-r border-white/[0.06]">
      {/* Logo */}
      <div className="mb-5 w-9 h-9 rounded-2xl bg-green-500 flex items-center justify-center shadow-[0_0_24px_rgba(34,197,94,0.35)] shrink-0">
        <Bot className="w-[18px] h-[18px] text-black" strokeWidth={2.5} />
      </div>

      {items.map(({ href, match, icon: Icon, label }) => {
        const isActive = pathname.startsWith(match)
        return (
          <Link
            key={href}
            href={href}
            aria-label={label}
            className={`relative w-11 h-11 rounded-2xl flex items-center justify-center transition-all duration-200 group ${
              isActive
                ? "bg-white/[0.10] text-white ring-1 ring-white/[0.12] shadow-sm"
                : "text-white/35 hover:text-white/80 hover:bg-white/[0.06]"
            }`}
          >
            <Icon
              className="w-[18px] h-[18px] transition-transform duration-200 group-hover:scale-110"
              strokeWidth={isActive ? 2.2 : 1.8}
            />

            {/* Active left indicator */}
            {isActive && (
              <span className="absolute -left-[18px] top-1/2 -translate-y-1/2 w-0.5 h-5 bg-green-400 rounded-r-full" />
            )}

            {/* Tooltip */}
            <span className="pointer-events-none absolute left-[52px] z-50 whitespace-nowrap rounded-xl bg-white/[0.08] backdrop-blur-xl border border-white/[0.10] px-3 py-1.5 text-xs text-white/80 shadow-xl opacity-0 group-hover:opacity-100 transition-all duration-150 translate-x-1 group-hover:translate-x-0">
              {label}
            </span>
          </Link>
        )
      })}
    </nav>
  )
}
