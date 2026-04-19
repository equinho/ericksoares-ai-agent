import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"

const COOKIE = "dashboard_auth"
const PASSWORD = process.env.DASHBOARD_PASSWORD ?? ""

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl

  if (
    pathname.startsWith("/login") ||
    pathname.startsWith("/_next") ||
    pathname.startsWith("/api")
  ) {
    return NextResponse.next()
  }

  const auth = request.cookies.get(COOKIE)?.value
  if (auth === PASSWORD) return NextResponse.next()

  const loginUrl = request.nextUrl.clone()
  loginUrl.pathname = "/login"
  loginUrl.searchParams.set("from", pathname)
  return NextResponse.redirect(loginUrl)
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
}
