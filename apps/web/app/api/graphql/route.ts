import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { env } from "@/lib/env";

export async function POST(req: NextRequest) {
  const cookieStore = await cookies();
  const token = cookieStore.get(env.SESSION_COOKIE_NAME)?.value;
  const body = await req.text();

  const upstream = await fetch(env.GRAPHQL_ENDPOINT, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      ...(token ? { authorization: `Bearer ${token}` } : {}),
    },
    body,
  });

  return new NextResponse(upstream.body, {
    status: upstream.status,
    headers: { "content-type": "application/json" },
  });
}
