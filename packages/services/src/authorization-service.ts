import { randomUUID } from "crypto";
import {
  IAuthorizationService,
  IRegisterInput,
  IRegisterResponse,
  ILoginInput,
  ILoginResponse,
  ILogger,
  IUserStore,
  IRefreshTokenStore,
} from "@common";
import { signToken, verifyToken, hashPassword, comparePassword } from "@auth";
import { generateRefreshToken, hashRefreshToken } from "@auth";
import { CustomError } from "./custom-error";

const REFRESH_TOKEN_TTL_MS = 30 * 24 * 60 * 60 * 1000; // 30 days

export class AuthorizationService implements IAuthorizationService {
  private readonly logger: ILogger;
  private readonly jwtSecret: string;
  private readonly userStore: IUserStore;
  private readonly refreshTokenStore: IRefreshTokenStore;

  constructor(
    logger: ILogger,
    jwtSecret: string,
    userStore: IUserStore,
    refreshTokenStore: IRefreshTokenStore
  ) {
    this.logger = logger;
    this.jwtSecret = jwtSecret;
    this.userStore = userStore;
    this.refreshTokenStore = refreshTokenStore;
    this.logger.debug("AuthorizationService initialized");
  }

  public async verifyToken(token: string): Promise<{ email: string }> {
    try {
      this.logger.debug("Verifying token");
      if (!token) throw new Error("Token is required");
      if (!this.jwtSecret) throw new Error("JWT secret is not configured");
      const payload = verifyToken(token, this.jwtSecret);
      this.logger.debug("Token verified successfully");
      return { email: payload.userId };
    } catch (error: any) {
      this.logger.error("Error verifying token", error as Error);
      if (
        error?.message === "Token is required" ||
        error?.message === "JWT secret is not configured"
      ) {
        throw error;
      }
      throw new Error("Invalid or expired token");
    }
  }

  public async register(
    registerInput: IRegisterInput
  ): Promise<IRegisterResponse> {
    const { email, name, tenantId, password } = registerInput;
    this.logger.debug("Registering user", { email });
    if (!email || !tenantId || !name || !password) {
      this.logger.error("Invalid are required for registration");
      throw new Error("Invalid are required");
    }
    if (!this.jwtSecret) {
      this.logger.error("JWT secret is not configured");
      throw new Error("JWT secret is not configured");
    }

    const passwordHash = await hashPassword(password);
    await this.userStore.saveUser({
      tenantId,
      email,
      name,
      passwordHash,
      createdAt: new Date().toISOString(),
      isActive: true,
    });

    this.logger.debug("User registered successfully", { email, tenantId });
    return { success: true, message: "User registered successfully" };
  }

  public async login(loginInput: ILoginInput): Promise<ILoginResponse> {
    const { email, tenantId, password } = loginInput;
    this.logger.debug("Logging in user", { email });

    const user = await this.userStore.getUser(tenantId, email);
    if (!user) {
      this.logger.error("User not found");
      throw new Error("User not found");
    }
    if (!(await comparePassword(password, user.passwordHash))) {
      this.logger.error("Invalid credentials");
      throw new Error("Invalid credentials");
    }

    const accessToken = signToken(
      { userId: user.email, email: user.email, tenantId: user.tenantId },
      this.jwtSecret
    );

    const rawRefreshToken = generateRefreshToken();
    const tokenId = hashRefreshToken(rawRefreshToken);
    const family = randomUUID();
    const now = new Date();
    const expiresAt = new Date(now.getTime() + REFRESH_TOKEN_TTL_MS);

    await this.refreshTokenStore.save({
      tokenId,
      family,
      userId: email,
      tenantId,
      isRevoked: false,
      createdAt: now.toISOString(),
      expiresAt: expiresAt.toISOString(),
      ttl: Math.floor(expiresAt.getTime() / 1000),
    });

    this.logger.debug("User logged in successfully", { email });
    return {
      token: accessToken,
      refreshToken: rawRefreshToken,
      user: {
        email: user.email,
        name: user.name,
        tenantId: user.tenantId,
        isActive: user.isActive,
      },
    };
  }

  public async refreshToken(rawRefreshToken: string): Promise<ILoginResponse> {
    if (!rawRefreshToken) {
      throw new CustomError(
        "Refresh token is required",
        "INVALID_REFRESH_TOKEN"
      );
    }

    const tokenId = hashRefreshToken(rawRefreshToken);
    const stored = await this.refreshTokenStore.findById(tokenId);

    if (!stored) {
      throw new CustomError("Invalid refresh token", "INVALID_REFRESH_TOKEN");
    }

    // Application-level expiry check (DynamoDB TTL deletion is eventually consistent)
    if (new Date(stored.expiresAt) <= new Date()) {
      throw new CustomError("Refresh token expired", "REFRESH_TOKEN_EXPIRED");
    }

    // Reuse-attack: a revoked token being replayed means the rotation chain was
    // compromised. Revoke the whole family so neither the real user nor an attacker
    // can continue using it — forcing a fresh login.
    if (stored.isRevoked) {
      this.logger.error(
        "Refresh token reuse detected — revoking family",
        undefined,
        { family: stored.family, userId: stored.userId }
      );
      await this.refreshTokenStore.revokeFamily(stored.family);
      throw new CustomError(
        "Refresh token already used. Please log in again.",
        "REFRESH_TOKEN_REUSED"
      );
    }

    const user = await this.userStore.getUser(stored.tenantId, stored.userId);
    if (!user || !user.isActive) {
      throw new CustomError("User not found or inactive", "USER_NOT_FOUND");
    }

    // Rotate: revoke old, issue new in the same family.
    await this.refreshTokenStore.revokeToken(tokenId);

    const newRawToken = generateRefreshToken();
    const newTokenId = hashRefreshToken(newRawToken);
    const now = new Date();
    const expiresAt = new Date(now.getTime() + REFRESH_TOKEN_TTL_MS);

    await this.refreshTokenStore.save({
      tokenId: newTokenId,
      family: stored.family,
      userId: stored.userId,
      tenantId: stored.tenantId,
      isRevoked: false,
      createdAt: now.toISOString(),
      expiresAt: expiresAt.toISOString(),
      ttl: Math.floor(expiresAt.getTime() / 1000),
    });

    const accessToken = signToken(
      { userId: user.email, email: user.email, tenantId: user.tenantId },
      this.jwtSecret
    );

    this.logger.debug("Refresh token rotated", { userId: stored.userId });
    return {
      token: accessToken,
      refreshToken: newRawToken,
      user: {
        email: user.email,
        name: user.name,
        tenantId: user.tenantId,
        isActive: user.isActive,
      },
    };
  }
}
