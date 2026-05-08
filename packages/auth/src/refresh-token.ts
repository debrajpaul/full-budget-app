import { randomUUID, createHash } from "crypto";

export function generateRefreshToken(): string {
  return randomUUID();
}

export function hashRefreshToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}
