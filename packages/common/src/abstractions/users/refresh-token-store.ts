import { IRefreshToken } from "./refresh-token";

export interface IRefreshTokenStore {
  save(token: IRefreshToken): Promise<void>;
  findById(tokenId: string): Promise<IRefreshToken | null>;
  revokeToken(tokenId: string): Promise<void>;
  // Revokes every token in the family — called on reuse-attack detection.
  revokeFamily(family: string): Promise<void>;
}
