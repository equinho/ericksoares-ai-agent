import { NavRail } from "@/components/nav-rail"

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex h-screen bg-black text-white overflow-hidden relative">
      {/* Ambient glow */}
      <div
        className="pointer-events-none absolute inset-0 z-0"
        style={{
          background:
            "radial-gradient(ellipse 90% 50% at 50% 0%, rgba(34,197,94,0.055), transparent 65%)",
        }}
      />
      <NavRail />
      <div className="relative z-10 flex-1 min-w-0 flex overflow-hidden">
        {children}
      </div>
    </div>
  )
}
