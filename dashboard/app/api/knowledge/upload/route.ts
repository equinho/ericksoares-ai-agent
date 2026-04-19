import { NextRequest, NextResponse } from "next/server"
import { createServerClient } from "@/lib/supabase-server"

export async function POST(req: NextRequest) {
  const formData = await req.formData()
  const file = formData.get("file") as File | null
  if (!file) return NextResponse.json({ error: "No file" }, { status: 400 })

  // PostgreSQL rejects null bytes (\u0000) in text columns
  const content = (await file.text()).replace(/\u0000/g, "")
  const supabase = createServerClient()
  const { data, error } = await supabase
    .from("knowledge_files")
    .insert({ name: file.name, content, file_size: file.size })
    .select("id, name, content, file_size, created_at")
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}
