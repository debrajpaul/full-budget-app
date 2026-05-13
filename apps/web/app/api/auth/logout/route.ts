import { type NextRequest, NextResponse } from "next/server";
import { env } from "@/lib/env";

export async function POST(req: NextRequest) {
  // Build the redirect URL from the incoming request origin so this works
  // on any hostname (localhost, staging, production).
  const loginUrl = new URL("/login", req.url);
  const res = NextResponse.redirect(loginUrl, { status: 303 });

  // Delete both session and refresh cookies.
  res.cookies.delete(env.SESSION_COOKIE_NAME);
  res.cookies.delete("__Host-refresh");

  return res;
}
