import { cookies } from "next/headers";

export interface SessionUser {
  email: string;
  userId: string;
  tenantId: string;
}

// Decodes (does not verify) the JWT payload stored in the session cookie.
// Verification is the backend's responsibility; this is purely for rendering.
function decodePayload(token: string): SessionUser {
  try {
    const raw = token.split(".")[1] ?? "";
    const json = JSON.parse(Buffer.from(raw, "base64url").toString("utf-8"));
    return {
      email: String(json.email ?? ""),
      userId: String(json.userId ?? ""),
      tenantId: String(json.tenantId ?? ""),
    };
  } catch {
    return { email: "", userId: "", tenantId: "" };
  }
}

export async function getSessionUser(): Promise<SessionUser> {
  const name = process.env.SESSION_COOKIE_NAME ?? "__Host-session";
  const token = (await cookies()).get(name)?.value ?? "";
  return decodePayload(token);
}
