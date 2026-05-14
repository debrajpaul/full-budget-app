import { NextRequest, NextResponse } from "next/server";
import { env } from "@/lib/env";
import { registerSchema } from "@/lib/schemas/auth";

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const parsed = registerSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      {
        error: "Validation failed",
        issues: parsed.error.flatten().fieldErrors,
      },
      { status: 400 }
    );
  }

  // Strip confirmPassword before forwarding to the backend.
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { confirmPassword: _, ...registerInput } = parsed.data;

  const upstream = await fetch(env.GRAPHQL_ENDPOINT, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      query: `mutation Register($input: RegisterInput!) {
        register(input: $input) { success message }
      }`,
      variables: { input: registerInput },
    }),
  });

  const json = await upstream.json();
  if (json?.errors || !json?.data?.register?.success) {
    return NextResponse.json({ error: "Registration failed" }, { status: 400 });
  }

  return NextResponse.json({ ok: true });
}
