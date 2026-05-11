import { AuthorizationService } from "./authorization-service";
import { mock } from "jest-mock-extended";
import {
  ILogger,
  IUserStore,
  IRefreshTokenStore,
  IRefreshToken,
  IRegisterInput,
  ETenantType,
} from "@common";
import { signToken, verifyToken, hashPassword } from "@auth";

jest.mock("@auth", () => ({
  signToken: jest.fn(() => "mocked.jwt.token"),
  verifyToken: jest.fn(() => ({ userId: "user@example.com" })),
  hashPassword: jest.fn(async (pw: string) => `hashed-${pw}`),
  comparePassword: jest.fn(
    async (pw: string, hash: string) => hash === `hashed-${pw}`
  ),
  generateRefreshToken: jest.fn(() => "raw-refresh-token"),
  hashRefreshToken: jest.fn((t: string) => `hashed-${t}`),
}));

const TENANT = ETenantType.default;
const EMAIL = "user@example.com";
const JWT_SECRET = "supersecret";

const makeUser = (overrides = {}) => ({
  email: EMAIL,
  tenantId: TENANT,
  name: "User",
  passwordHash: "hashed-pw",
  isActive: true,
  createdAt: new Date().toISOString(),
  ...overrides,
});

const makeStoredToken = (
  overrides: Partial<IRefreshToken> = {}
): IRefreshToken => ({
  tokenId: "hashed-raw-refresh-token",
  family: "family-uuid",
  userId: EMAIL,
  tenantId: TENANT,
  isRevoked: false,
  createdAt: new Date().toISOString(),
  expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
  ttl: Math.floor(Date.now() / 1000) + 30 * 24 * 60 * 60,
  ...overrides,
});

describe("AuthorizationService", () => {
  let logger: ReturnType<typeof mock<ILogger>>;
  let userStore: ReturnType<typeof mock<IUserStore>>;
  let refreshTokenStore: ReturnType<typeof mock<IRefreshTokenStore>>;
  let service: AuthorizationService;

  const makeService = () =>
    new AuthorizationService(logger, JWT_SECRET, userStore, refreshTokenStore);

  beforeEach(() => {
    logger = mock<ILogger>();
    userStore = mock<IUserStore>();
    refreshTokenStore = mock<IRefreshTokenStore>();
    service = makeService();
    jest.clearAllMocks();
  });

  // ── verifyToken ────────────────────────────────────────────────────────────

  it("verifies token and returns email", async () => {
    const result = await service.verifyToken("sometoken");
    expect(verifyToken).toHaveBeenCalledWith("sometoken", JWT_SECRET);
    expect(result).toEqual({ email: "user@example.com" });
  });

  it("throws when token is missing", async () => {
    await expect(service.verifyToken("")).rejects.toThrow("Token is required");
  });

  it("throws when jwtSecret is missing", async () => {
    service = new AuthorizationService(
      logger,
      "",
      userStore,
      refreshTokenStore
    );
    await expect(service.verifyToken("sometoken")).rejects.toThrow(
      "JWT secret is not configured"
    );
  });

  // ── register ───────────────────────────────────────────────────────────────

  it("registers a user and returns success", async () => {
    const input: IRegisterInput = {
      email: EMAIL,
      name: "User",
      tenantId: TENANT,
      password: "pw",
    };
    userStore.saveUser.mockResolvedValue();
    const result = await service.register(input);
    expect(hashPassword).toHaveBeenCalledWith("pw");
    expect(userStore.saveUser).toHaveBeenCalledWith(
      expect.objectContaining({ email: EMAIL, passwordHash: "hashed-pw" })
    );
    expect(result).toEqual({
      success: true,
      message: "User registered successfully",
    });
  });

  it("throws when registration input is invalid", async () => {
    await expect(
      service.register({
        email: "",
        name: "",
        tenantId: "",
        password: "",
      } as any)
    ).rejects.toThrow("Invalid are required");
  });

  // ── login ──────────────────────────────────────────────────────────────────

  it("login returns access token, refreshToken and user", async () => {
    userStore.getUser.mockResolvedValue(makeUser());
    refreshTokenStore.save.mockResolvedValue();

    const result = await service.login({
      email: EMAIL,
      tenantId: TENANT,
      password: "pw",
    });

    expect(signToken).toHaveBeenCalledWith(
      { userId: EMAIL, email: EMAIL, tenantId: TENANT },
      JWT_SECRET
    );
    expect(refreshTokenStore.save).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: EMAIL,
        tenantId: TENANT,
        isRevoked: false,
      })
    );
    expect(result.token).toBe("mocked.jwt.token");
    expect(typeof result.refreshToken).toBe("string");
    expect(result.user.email).toBe(EMAIL);
  });

  it("login throws when user not found", async () => {
    userStore.getUser.mockResolvedValue(undefined);
    await expect(
      service.login({ email: "x", tenantId: TENANT, password: "pw" } as any)
    ).rejects.toThrow("User not found");
  });

  it("login throws when password is wrong", async () => {
    userStore.getUser.mockResolvedValue(
      makeUser({ passwordHash: "hashed-wrong" })
    );
    await expect(
      service.login({ email: EMAIL, tenantId: TENANT, password: "pw" } as any)
    ).rejects.toThrow("Invalid credentials");
  });

  // ── refreshToken ───────────────────────────────────────────────────────────

  it("refreshToken rotates tokens and returns new LoginResponse", async () => {
    refreshTokenStore.findById.mockResolvedValue(makeStoredToken());
    refreshTokenStore.revokeToken.mockResolvedValue();
    refreshTokenStore.save.mockResolvedValue();
    userStore.getUser.mockResolvedValue(makeUser());

    const result = await service.refreshToken("raw-refresh-token");

    expect(refreshTokenStore.revokeToken).toHaveBeenCalled();
    expect(refreshTokenStore.save).toHaveBeenCalledWith(
      expect.objectContaining({ family: "family-uuid", isRevoked: false })
    );
    expect(result.token).toBe("mocked.jwt.token");
    expect(typeof result.refreshToken).toBe("string");
  });

  it("refreshToken throws INVALID_REFRESH_TOKEN when token not found", async () => {
    refreshTokenStore.findById.mockResolvedValue(null);
    await expect(service.refreshToken("unknown")).rejects.toMatchObject({
      code: "INVALID_REFRESH_TOKEN",
    });
  });

  it("refreshToken throws REFRESH_TOKEN_EXPIRED for expired token", async () => {
    refreshTokenStore.findById.mockResolvedValue(
      makeStoredToken({ expiresAt: new Date(Date.now() - 1000).toISOString() })
    );
    await expect(service.refreshToken("old-token")).rejects.toMatchObject({
      code: "REFRESH_TOKEN_EXPIRED",
    });
  });

  it("refreshToken detects reuse, revokes family, and throws REFRESH_TOKEN_REUSED", async () => {
    refreshTokenStore.findById.mockResolvedValue(
      makeStoredToken({ isRevoked: true })
    );
    refreshTokenStore.revokeFamily.mockResolvedValue();

    await expect(service.refreshToken("replayed-token")).rejects.toMatchObject({
      code: "REFRESH_TOKEN_REUSED",
    });
    expect(refreshTokenStore.revokeFamily).toHaveBeenCalledWith("family-uuid");
  });

  it("refreshToken throws USER_NOT_FOUND when user is inactive", async () => {
    refreshTokenStore.findById.mockResolvedValue(makeStoredToken());
    userStore.getUser.mockResolvedValue(makeUser({ isActive: false }));

    await expect(service.refreshToken("token")).rejects.toMatchObject({
      code: "USER_NOT_FOUND",
    });
  });

  it("refreshToken throws INVALID_REFRESH_TOKEN when raw token is empty", async () => {
    await expect(service.refreshToken("")).rejects.toMatchObject({
      code: "INVALID_REFRESH_TOKEN",
    });
  });
});
