import { ETenantType } from "./user";

export interface IRefreshToken {
  tokenId: string; // SHA-256 hash of the raw opaque token
  family: string; // rotation chain UUID — shared by all tokens in one login session
  userId: string; // user email (matches IUser.email)
  tenantId: ETenantType;
  isRevoked: boolean;
  createdAt: string;
  expiresAt: string; // ISO-8601
  ttl: number; // Unix epoch seconds — DynamoDB TTL attribute
}
