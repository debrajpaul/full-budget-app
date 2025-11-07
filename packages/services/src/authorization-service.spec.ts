import { AuthorizationService } from "./authorization-service";
import { mock } from "jest-mock-extended";
import {
  ILogger,
  IUserStore,
  IRegisterInput,
  ILoginInput,
  ETenantType,
} from "@common";
import { signToken, verifyToken, hashPassword, comparePassword } from "@auth";

jest.mock("@auth", () => ({
  signToken: jest.fn(() => "mocked.jwt.token"),
  verifyToken: jest.fn(() => ({ userId: "user@example.com" })),
  hashPassword: jest.fn(async (pw) => `hashed-${pw}`),
  comparePassword: jest.fn(async (pw, hash) => hash === `hashed-${pw}`),
}));

describe("AuthorizationService", () => {
  let loggerMock: ReturnType<typeof mock<ILogger>>;
  let userStoreMock: ReturnType<typeof mock<IUserStore>>;
  let service: AuthorizationService;
  const jwtSecret = "supersecret";

  beforeEach(() => {
    loggerMock = mock<ILogger>();
    userStoreMock = mock<IUserStore>();
    service = new AuthorizationService(loggerMock, jwtSecret, userStoreMock);
    jest.clearAllMocks();
  });

  it("should verify token and return email", async () => {
    const result = await service.verifyToken("sometoken");
    expect(verifyToken).toHaveBeenCalledWith("sometoken", jwtSecret);
    expect(result).toEqual({ email: "user@example.com" });
    expect(loggerMock.debug).toHaveBeenCalledWith("Verifying token");
  });

  it("should throw if token is missing", async () => {
    await expect(service.verifyToken("")).rejects.toThrow("Token is required");
    expect(loggerMock.error).toHaveBeenCalledWith(
      "Error verifying token",
      expect.any(Error),
    );
  });

  it("should throw if jwtSecret is missing", async () => {
    service = new AuthorizationService(loggerMock, "", userStoreMock);
    await expect(service.verifyToken("sometoken")).rejects.toThrow(
      "JWT secret is not configured",
    );
    expect(loggerMock.error).toHaveBeenCalledWith(
      "Error verifying token",
      expect.any(Error),
    );
  });

  it("should register a user and return success", async () => {
    const input: IRegisterInput = {
      email: "user@example.com",
      name: "User",
      tenantId: ETenantType.default,
      password: "pw",
    };
    userStoreMock.saveUser.mockResolvedValue();
    const result = await service.register(input);
    expect(hashPassword).toHaveBeenCalledWith("pw");
    expect(userStoreMock.saveUser).toHaveBeenCalledWith(
      expect.objectContaining({
        email: input.email,
        tenantId: input.tenantId,
        name: input.name,
        passwordHash: "hashed-pw",
        isActive: true,
      }),
    );
    expect(result).toEqual({
      success: true,
      message: "User registered successfully",
    });
    expect(loggerMock.debug).toHaveBeenCalledWith(
      "User registered successfully",
      {
        email: input.email,
        tenantId: input.tenantId,
      },
    );
  });

  it("should throw if registration input is invalid", async () => {
    await expect(
      service.register({
        email: "",
        name: "",
        tenantId: "",
        password: "",
      } as any),
    ).rejects.toThrow("Invalid are required");
    expect(loggerMock.error).toHaveBeenCalledWith(
      "Invalid are required for registration",
    );
  });

  it("should throw if jwtSecret is missing on register", async () => {
    service = new AuthorizationService(loggerMock, "", userStoreMock);
    await expect(
      service.register({
        email: "a",
        name: "b",
        tenantId: "c",
        password: "d",
      } as any),
    ).rejects.toThrow("JWT secret is not configured");
    expect(loggerMock.error).toHaveBeenCalledWith(
      "JWT secret is not configured",
    );
  });

  it("should login a user and return token", async () => {
    const input: ILoginInput = {
      email: "user@example.com",
      tenantId: ETenantType.default,
      password: "pw",
    };
    userStoreMock.getUser.mockResolvedValue({
      email: input.email,
      tenantId: input.tenantId,
      name: "User",
      passwordHash: "hashed-pw",
      isActive: true,
      createdAt: new Date().toISOString(),
    });
    const result = await service.login(input);
    expect(userStoreMock.getUser).toHaveBeenCalledWith(
      input.tenantId,
      input.email,
    );
    expect(comparePassword).toHaveBeenCalledWith("pw", "hashed-pw");
    expect(signToken).toHaveBeenCalledWith(
      { userId: input.email, email: input.email, tenantId: input.tenantId },
      jwtSecret,
    );
    expect(result).toEqual({
      token: "mocked.jwt.token",
      user: {
        email: input.email,
        name: "User",
        tenantId: input.tenantId,
        isActive: true,
      },
    });
    expect(loggerMock.debug).toHaveBeenCalledWith(
      "User logged in successfully",
      { email: input.email },
    );
  });

  it("should throw if user not found on login", async () => {
    userStoreMock.getUser.mockResolvedValue(undefined);
    await expect(
      service.login({ email: "a", tenantId: "b", password: "c" } as any),
    ).rejects.toThrow("User not found");
    expect(loggerMock.error).toHaveBeenCalledWith("User not found");
  });

  it("should throw if password is invalid on login", async () => {
    userStoreMock.getUser.mockResolvedValue({
      email: "a",
      tenantId: ETenantType.default,
      name: "n",
      passwordHash: "hashed-wrong",
      isActive: true,
      createdAt: new Date().toISOString(),
    });
    await expect(
      service.login({
        email: "a",
        tenantId: ETenantType.default,
        password: "pw",
      } as any),
    ).rejects.toThrow("Invalid credentials");
    expect(loggerMock.error).toHaveBeenCalledWith("Invalid credentials");
  });
});
