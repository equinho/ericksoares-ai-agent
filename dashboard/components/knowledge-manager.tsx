"use client"

import { useState, useRef, useTransition } from "react"
import { Upload, FileText, Trash2, X, AlertCircle } from "lucide-react"
import { formatDistanceToNow } from "@/lib/date"
import type { KnowledgeFile } from "@/lib/types"

type Props = {
  initialFiles: KnowledgeFile[]
}

const MAX_FILE_SIZE = 10 * 1024 * 1024
const ALLOWED_TYPES = [".txt", ".md"]

function formatFileSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`
}

export function KnowledgeManager({ initialFiles }: Props) {
  const [files, setFiles] = useState<KnowledgeFile[]>(initialFiles)
  const [isDragging, setIsDragging] = useState(false)
  const [previewFile, setPreviewFile] = useState<KnowledgeFile | null>(null)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()
  const inputRef = useRef<HTMLInputElement>(null)

  async function handleFile(file: File) {
    setError(null)
    const ext = "." + file.name.split(".").pop()?.toLowerCase()
    if (!ALLOWED_TYPES.includes(ext)) {
      setError(`Formato não suportado. Use ${ALLOWED_TYPES.join(" ou ")}.`)
      return
    }
    if (file.size > MAX_FILE_SIZE) {
      setError("Arquivo muito grande. Máximo 10MB.")
      return
    }
    setUploading(true)
    try {
      const fd = new FormData()
      fd.append("file", file)
      const res = await fetch("/api/knowledge/upload", { method: "POST", body: fd })
      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        setError(body.error ?? "Erro ao salvar arquivo.")
        return
      }
      const saved: KnowledgeFile = await res.json()
      setFiles((prev) => [saved, ...prev])
    } catch {
      setError("Erro ao salvar arquivo.")
    } finally {
      setUploading(false)
    }
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault()
    setIsDragging(false)
    const file = e.dataTransfer.files[0]
    if (file) handleFile(file)
  }

  function handleDelete(id: string) {
    startTransition(async () => {
      await fetch("/api/knowledge/delete", { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id }) })
      setFiles((prev) => prev.filter((f) => f.id !== id))
      if (previewFile?.id === id) setPreviewFile(null)
    })
  }

  return (
    <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
      {/* Header */}
      <div className="px-7 py-4 border-b border-white/[0.06] shrink-0">
        <h2 className="text-sm font-semibold text-white/90">Base de Conhecimento</h2>
        <p className="text-xs text-white/30 mt-0.5">Arquivos que o agente usa como referência nas respostas</p>
      </div>

      {/* Body */}
      <div className="flex-1 flex min-h-0 overflow-hidden">
        {/* Left: upload + list */}
        <div className="flex-1 flex flex-col p-6 gap-4 min-w-0 overflow-y-auto">
          {/* Drop zone */}
          <div
            onDragOver={(e) => { e.preventDefault(); setIsDragging(true) }}
            onDragLeave={() => setIsDragging(false)}
            onDrop={handleDrop}
            onClick={() => inputRef.current?.click()}
            className={`border-2 border-dashed rounded-2xl p-8 text-center cursor-pointer select-none transition-all duration-200 ${
              isDragging
                ? "border-green-400/50 bg-green-500/[0.05] scale-[1.01]"
                : uploading
                ? "border-white/[0.08] bg-white/[0.02]"
                : "border-white/[0.09] hover:border-white/[0.18] bg-white/[0.02] hover:bg-white/[0.04]"
            }`}
          >
            <input
              ref={inputRef}
              type="file"
              accept=".txt,.md"
              hidden
              onChange={(e) => {
                const f = e.target.files?.[0]
                if (f) handleFile(f)
                e.target.value = ""
              }}
            />
            {uploading ? (
              <div className="flex flex-col items-center gap-2.5">
                <div className="w-6 h-6 border-2 border-green-400 border-t-transparent rounded-full animate-spin" />
                <p className="text-sm text-white/40">Carregando arquivo...</p>
              </div>
            ) : (
              <>
                <Upload className="w-6 h-6 text-white/20 mx-auto mb-3" strokeWidth={1.5} />
                <p className="text-sm text-white/50">
                  Arraste um arquivo ou{" "}
                  <span className="text-green-400 font-medium">clique para selecionar</span>
                </p>
                <p className="text-xs text-white/20 mt-1.5">.txt e .md · máx 10MB</p>
              </>
            )}
          </div>

          {/* Error */}
          {error && (
            <div className="flex items-center gap-2 text-red-400 text-xs bg-red-500/[0.08] border border-red-500/[0.15] rounded-xl px-3.5 py-2.5">
              <AlertCircle className="w-3.5 h-3.5 shrink-0" />
              {error}
              <button onClick={() => setError(null)} className="ml-auto text-red-400/60 hover:text-red-400 transition-colors">
                <X className="w-3 h-3" />
              </button>
            </div>
          )}

          {/* File list */}
          {files.length === 0 ? (
            <div className="flex-1 flex items-center justify-center py-8">
              <p className="text-white/15 text-sm">Nenhum arquivo ainda</p>
            </div>
          ) : (
            <div className="space-y-2">
              {files.map((file) => (
                <div
                  key={file.id}
                  onClick={() => setPreviewFile(previewFile?.id === file.id ? null : file)}
                  className={`flex items-center gap-3 p-3.5 rounded-xl border cursor-pointer transition-all duration-150 group ${
                    previewFile?.id === file.id
                      ? "border-green-500/25 bg-green-500/[0.06] ring-1 ring-green-500/20"
                      : "border-white/[0.07] hover:border-white/[0.13] bg-white/[0.02] hover:bg-white/[0.05]"
                  }`}
                >
                  <div className="w-9 h-9 rounded-xl bg-white/[0.06] flex items-center justify-center shrink-0">
                    <FileText className="w-4 h-4 text-white/40" strokeWidth={1.6} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-white/80 truncate">{file.name}</p>
                    <p className="text-xs text-white/30 mt-0.5">
                      {formatFileSize(file.file_size)} · {formatDistanceToNow(file.created_at)}
                    </p>
                  </div>
                  <button
                    onClick={(e) => { e.stopPropagation(); handleDelete(file.id) }}
                    disabled={isPending}
                    className="shrink-0 opacity-0 group-hover:opacity-100 w-8 h-8 rounded-xl flex items-center justify-center text-white/30 hover:text-red-400 hover:bg-red-400/[0.08] transition-all"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Preview panel */}
        {previewFile && (
          <div className="w-80 shrink-0 border-l border-white/[0.06] flex flex-col overflow-hidden">
            <div className="flex items-center justify-between px-5 py-3.5 border-b border-white/[0.06] shrink-0">
              <div className="min-w-0 flex-1 mr-2">
                <p className="text-xs font-medium text-white/70 truncate">{previewFile.name}</p>
                <p className="text-[10px] text-white/25 mt-0.5">{formatFileSize(previewFile.file_size)}</p>
              </div>
              <button onClick={() => setPreviewFile(null)} className="text-white/25 hover:text-white/60 transition-colors shrink-0">
                <X className="w-4 h-4" />
              </button>
            </div>
            <pre className="flex-1 p-5 text-xs text-white/40 overflow-auto leading-relaxed whitespace-pre-wrap break-words font-mono">
              {previewFile.content}
            </pre>
          </div>
        )}
      </div>
    </div>
  )
}
