import {
  IAuthorizationService,
  IRegisterInput,
  IRegisterResponse,
  ILoginInput,
  ILoginResponse,
  ILogger,
  IUserStore,
} from "@common";
import { signToken, verifyToken } from "@auth";
import { hashPassword, comparePassword } from "@auth";

export class AuthorizationService implements IAuthorizationService {
  private readonly logger: ILogger;
  private readonly jwtSecret: string;
  private readonly userStore: IUserStore;

  constructor(logger: ILogger, jwtSecret: string, userStore: IUserStore) {
    this.logger = logger;
    this.jwtSecret = jwtSecret;
    this.userStore = userStore;
    this.logger.info("AuthorizationService initialized");
  }

  public async verifyToken(token: string): Promise<{ email: string }> {
    try {
      this.logger.info("Verifying token");
      if (!token) throw new Error("Token is required");
      this.logger.debug("Token provided", { token });
      if (!this.jwtSecret) throw new Error("JWT secret is not configured");
      this.logger.debug("JWT secret is configured");
      const payload = verifyToken(token, this.jwtSecret);
      this.logger.debug("Token verified successfully", { payload });
      return { email: payload.userId };
    } catch (error) {
      this.logger.error("Error verifying token", error as Error);
      throw new Error("Invalid or expired token");
    }
  }

  public async register(
    registerInput: IRegisterInput,
  ): Promise<IRegisterResponse> {
    const { email, name, tenantId, password } = registerInput;
    this.logger.info("Registering user", { email });
    if (!email || !tenantId || !name || !password) {
      this.logger.error("Invalid are required for registration");
      throw new Error("Invalid are required");
    }
    if (!this.jwtSecret) {
      this.logger.error("JWT secret is not configured");
      throw new Error("JWT secret is not configured");
    }
    this.logger.debug("JWT secret is configured");

    const passwordHash = await hashPassword(password);
    const user = {
      tenantId,
      email,
      name,
      passwordHash,
      createdAt: new Date().toISOString(),
      isActive: true,
    };
    await this.userStore.saveUser(user);

    this.logger.debug("User registered successfully", { email, tenantId });
    this.logger.info("User registration successful");
    return { success: true, message: "User registered successfully" };
  }

  public async login(loginInput: ILoginInput): Promise<ILoginResponse> {
    const { email, tenantId, password } = loginInput;
    this.logger.info("Logging in user", { email });
    const user = await this.userStore.getUser(tenantId, email);
    if (!user) {
      this.logger.error("User not found");
      throw new Error("User not found");
    }
    if (!(await comparePassword(password, user.passwordHash))) {
      this.logger.error("Invalid credentials");
      throw new Error("Invalid credentials");
    }
    const token = signToken(
      { userId: user.email, email: user.email, tenantId: user.tenantId },
      this.jwtSecret,
    );
    this.logger.debug("User logged in successfully", { email });
    this.logger.info("User login successful");
    return {
      token,
      user: {
        email: user.email,
        name: user.name,
        tenantId: user.tenantId,
        isActive: user.isActive,
      },
    };
  }
}
