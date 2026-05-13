import { type NextRequest, NextResponse } from "next/server";
import { env } from "@/lib/env";

const PUBLIC = new Set(["/login", "/register"]);

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // Let API routes and Next.js internals pass through unconditionally.
  if (pathname.startsWith("/api") || pathname.startsWith("/_next")) {
    return NextResponse.next();
  }

  const hasSession = req.cookies.has(env.SESSION_COOKIE_NAME);

  // Authenticated user hitting a public page → send to dashboard.
  if (PUBLIC.has(pathname) && hasSession) {
    return NextResponse.redirect(new URL("/dashboard", req.url));
  }

  // Unauthenticated user hitting a protected page → send to login.
  if (!PUBLIC.has(pathname) && !hasSession) {
    const loginUrl = new URL("/login", req.url);
    loginUrl.searchParams.set("next", pathname);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
