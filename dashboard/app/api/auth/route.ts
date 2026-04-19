import { NextRequest, NextResponse } from "next/server"
import { cookies } from "next/headers"

const COOKIE = "dashboard_auth"
const PASSWORD = process.env.DASHBOARD_PASSWORD ?? ""

export async function POST(req: NextRequest) {
  const { password } = await req.json()

  if (!PASSWORD || password !== PASSWORD) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const cookieStore = await cookies()
  cookieStore.set(COOKIE, PASSWORD, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 60 * 60 * 24 * 30, // 30 days
    path: "/",
  })

  return NextResponse.json({ ok: true })
}
