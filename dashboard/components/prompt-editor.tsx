"use client"

import { useState, useEffect, useTransition } from "react"
import { Save, Check, Loader2, Clock, RotateCcw, X } from "lucide-react"
import { saveSystemPrompt } from "@/lib/actions"
import { formatDistanceToNow } from "@/lib/date"
import type { PromptVersion } from "@/lib/types"

type Props = {
  initialPrompt: string
  history: PromptVersion[]
}

type SaveState = "idle" | "saving" | "saved"

export function PromptEditor({ initialPrompt, history }: Props) {
  const [prompt, setPrompt] = useState(initialPrompt)
  const [isDirty, setIsDirty] = useState(false)
  const [saveState, setSaveState] = useState<SaveState>("idle")
  const [showHistory, setShowHistory] = useState(false)
  const [isPending, startTransition] = useTransition()

  const isSaving = saveState === "saving" || isPending

  function handleChange(value: string) {
    setPrompt(value)
    setIsDirty(value !== initialPrompt)
    if (saveState === "saved") setSaveState("idle")
  }

  function handleSave() {
    if (!isDirty || isSaving) return
    setSaveState("saving")
    startTransition(async () => {
      await saveSystemPrompt(prompt)
      setSaveState("saved")
      setIsDirty(false)
      setTimeout(() => setSaveState("idle"), 2500)
    })
  }

  function handleRestore(content: string) {
    setPrompt(content)
    setIsDirty(content !== initialPrompt)
    setShowHistory(false)
  }

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === "s") {
        e.preventDefault()
        handleSave()
      }
    }
    window.addEventListener("keydown", onKeyDown)
    return () => window.removeEventListener("keydown", onKeyDown)
  })

  return (
    <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-7 py-4 border-b border-white/[0.06] shrink-0">
        <div>
          <h2 className="text-sm font-semibold text-white/90">Prompt do Agente</h2>
          <p className="text-xs text-white/30 mt-0.5">Define comportamento e personalidade do bot</p>
        </div>
        <div className="flex items-center gap-2">
          {history.length > 0 && (
            <button
              onClick={() => setShowHistory(!showHistory)}
              className={`flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-xl transition-all duration-150 ${
                showHistory
                  ? "bg-white/[0.10] text-white/80 ring-1 ring-white/[0.12]"
                  : "text-white/35 hover:text-white/70 hover:bg-white/[0.06]"
              }`}
            >
              <Clock className="w-3.5 h-3.5" />
              Histórico
              <span className="bg-white/[0.10] text-white/50 rounded-full px-1.5 py-px text-[10px] leading-none">
                {history.length}
              </span>
            </button>
          )}
          <button
            onClick={handleSave}
            disabled={!isDirty || isSaving}
            className={`flex items-center gap-1.5 px-4 py-1.5 rounded-xl text-sm font-medium transition-all duration-200 ${
              saveState === "saved"
                ? "bg-green-500/15 text-green-400 ring-1 ring-green-500/25"
                : isDirty && !isSaving
                ? "bg-white text-black hover:bg-white/90 active:scale-95 shadow-sm"
                : "bg-white/[0.05] text-white/20 cursor-not-allowed"
            }`}
          >
            {isSaving && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
            {saveState === "saved" && !isSaving && <Check className="w-3.5 h-3.5" />}
            {saveState === "idle" && isDirty && !isSaving && <Save className="w-3.5 h-3.5" />}
            <span>{isSaving ? "Salvando..." : saveState === "saved" ? "Salvo!" : "Salvar"}</span>
          </button>
        </div>
      </div>

      {/* Body */}
      <div className="flex-1 flex min-h-0 overflow-hidden">
        {/* Textarea */}
        <div className="flex-1 flex flex-col min-h-0 p-6">
          <textarea
            value={prompt}
            onChange={(e) => handleChange(e.target.value)}
            spellCheck={false}
            placeholder={`Digite o system prompt do agente...\n\nExemplo:\nVocê é um assistente de vendas da empresa X. Seja cordial, objetivo e sempre ofereça ajuda para dúvidas sobre nossos produtos.`}
            className="flex-1 w-full bg-white/[0.03] border border-white/[0.07] hover:border-white/[0.12] focus:border-white/[0.20] rounded-2xl p-5 text-sm text-white/85 font-mono leading-relaxed resize-none outline-none transition-all duration-200 placeholder:text-white/15"
          />
          <div className="flex items-center justify-between mt-2.5 px-1">
            <span className="text-xs">
              {isDirty
                ? <span className="text-amber-400/70">● Alterações não salvas · Ctrl+S para salvar</span>
                : <span className="text-white/20">Ctrl+S / ⌘S para salvar</span>
              }
            </span>
            <span className={`text-xs tabular-nums ${prompt.length > 10000 ? "text-amber-400" : "text-white/20"}`}>
              {prompt.length.toLocaleString("pt-BR")} chars
            </span>
          </div>
        </div>

        {/* History panel */}
        {showHistory && (
          <div className="w-72 shrink-0 border-l border-white/[0.06] flex flex-col overflow-hidden">
            <div className="flex items-center justify-between px-5 py-3.5 border-b border-white/[0.06] shrink-0">
              <p className="text-[10px] font-semibold text-white/25 uppercase tracking-widest">Versões anteriores</p>
              <button onClick={() => setShowHistory(false)} className="text-white/25 hover:text-white/60 transition-colors">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto">
              {history.map((v, i) => (
                <button
                  key={v.id}
                  onClick={() => handleRestore(v.content)}
                  className="w-full text-left px-5 py-3.5 border-b border-white/[0.05] hover:bg-white/[0.04] transition-colors group"
                >
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-xs font-medium text-white/60">Versão {history.length - i}</span>
                    <span className="text-[10px] text-white/25">{formatDistanceToNow(v.created_at)}</span>
                  </div>
                  <p className="text-[11px] text-white/30 line-clamp-2 leading-relaxed">
                    {v.content.slice(0, 100)}{v.content.length > 100 ? "…" : ""}
                  </p>
                  <div className="flex items-center gap-1 mt-2 text-[10px] text-green-400/70 opacity-0 group-hover:opacity-100 transition-opacity">
                    <RotateCcw className="w-3 h-3" />
                    Restaurar
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
