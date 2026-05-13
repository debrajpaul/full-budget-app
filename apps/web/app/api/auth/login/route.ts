import { NextRequest, NextResponse } from "next/server";
import { env } from "@/lib/env";
import { loginSchema } from "@/lib/schemas/auth";

// __Host- / __Secure- prefixed cookies require Secure=true unconditionally.
const isSecurePrefix =
  env.SESSION_COOKIE_NAME.startsWith("__Host-") ||
  env.SESSION_COOKIE_NAME.startsWith("__Secure-");

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const parsed = loginSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      {
        error: "Validation failed",
        issues: parsed.error.flatten().fieldErrors,
      },
      { status: 400 }
    );
  }

  const upstream = await fetch(env.GRAPHQL_ENDPOINT, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      query: `mutation Login($input: LoginInput!) {
        login(input: $input) {
          token
          refreshToken
          user { email name tenantId isActive }
        }
      }`,
      variables: { input: parsed.data },
    }),
  });

  const json = await upstream.json();
  const token: string | undefined = json?.data?.login?.token;
  const refreshToken: string | undefined = json?.data?.login?.refreshToken;

  if (!token) {
    // Never forward raw GraphQL errors — they may contain internal details.
    return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });
  }

  const res = NextResponse.json({ user: json.data.login.user });
  const secure = isSecurePrefix || env.NODE_ENV === "production";

  res.cookies.set(env.SESSION_COOKIE_NAME, token, {
    httpOnly: true,
    secure,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24, // 24 h — revisit once refresh-token rotation is wired in
  });

  // Store the refresh token in a separate httpOnly cookie so the browser
  // can rotate it without the client JS ever seeing the raw value.
  if (refreshToken) {
    res.cookies.set("__Host-refresh", refreshToken, {
      httpOnly: true,
      secure: true, // __Host- always requires Secure
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24 * 30, // 30 days
    });
  }

  return res;
}
