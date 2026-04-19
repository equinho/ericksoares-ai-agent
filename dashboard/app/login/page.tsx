"use client"

import { Suspense, useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { Bot, ArrowRight, Loader2 } from "lucide-react"

function LoginForm() {
  const [password, setPassword] = useState("")
  const [error, setError] = useState(false)
  const [loading, setLoading] = useState(false)
  const router = useRouter()
  const searchParams = useSearchParams()
  const from = searchParams.get("from") ?? "/conversations"

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(false)

    const res = await fetch("/api/auth", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password }),
    })

    if (res.ok) {
      router.push(from)
    } else {
      setError(true)
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <div className="relative">
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Senha de acesso"
          autoFocus
          className="w-full bg-white/[0.05] border border-white/[0.10] hover:border-white/[0.18] focus:border-white/[0.28] rounded-xl px-4 py-3 text-sm text-white/90 placeholder:text-white/25 outline-none transition-all duration-200"
        />
      </div>

      {error && (
        <p className="text-xs text-red-400/90 text-center">
          Senha incorreta. Tente novamente.
        </p>
      )}

      <button
        type="submit"
        disabled={loading || !password}
        className="w-full flex items-center justify-center gap-2 bg-white text-black font-medium text-sm rounded-xl py-3 hover:bg-white/90 active:scale-[0.98] transition-all duration-150 disabled:opacity-40 disabled:cursor-not-allowed"
      >
        {loading ? (
          <Loader2 className="w-4 h-4 animate-spin" />
        ) : (
          <>
            Entrar
            <ArrowRight className="w-4 h-4" />
          </>
        )}
      </button>
    </form>
  )
}

export default function LoginPage() {
  return (
    <div className="min-h-screen bg-black flex items-center justify-center relative overflow-hidden">
      {/* Radial glow */}
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "radial-gradient(ellipse 80% 60% at 50% -10%, rgba(34,197,94,0.14), transparent 65%)",
        }}
      />

      {/* Subtle noise */}
      <div className="pointer-events-none absolute inset-0 opacity-[0.035] [background-image:radial-gradient(rgba(255,255,255,0.5)_1px,transparent_1px)] [background-size:16px_16px]" />

      {/* Card */}
      <div className="relative z-10 w-full max-w-[340px] px-4">
        {/* Icon + title */}
        <div className="text-center mb-8">
          <div className="inline-flex w-14 h-14 rounded-2xl bg-green-500/15 ring-1 ring-green-500/25 items-center justify-center mb-5 shadow-[0_0_40px_rgba(34,197,94,0.15)]">
            <Bot className="w-7 h-7 text-green-400" strokeWidth={1.8} />
          </div>
          <h1 className="text-xl font-semibold text-white/90 tracking-tight">WhatsApp Agent</h1>
          <p className="text-sm text-white/35 mt-1.5">Acesse o painel de controle</p>
        </div>

        {/* Glass form card */}
        <div className="bg-white/[0.04] backdrop-blur-xl border border-white/[0.08] rounded-2xl p-6 shadow-2xl">
          <Suspense fallback={<div className="h-[88px]" />}>
            <LoginForm />
          </Suspense>
        </div>
      </div>
    </div>
  )
}
