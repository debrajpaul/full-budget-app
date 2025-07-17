import { createUser, getUserByEmail } from '@db/models';
import { IAuthorizationService, IAuthPayload } from '@common/abstractions';
import { signToken, verifyToken } from '@auth/jwt';
import { hashPassword, comparePassword} from "@auth/password";
import { ILogger } from '@logger/index';

export class AuthorizationService implements IAuthorizationService {

  constructor(
    private readonly logger: ILogger,
    private jwtSecret: string, 
    private tokenExpiry: number,
    private tableName: string,
  ) {}

  public async verifyToken(token: string): Promise<{ userId: string }> {
    try {
      this.logger.info('Verifying token');
      if (!token) throw new Error('Token is required');
      this.logger.debug('Token provided', { token });
      if (!this.jwtSecret) throw new Error('JWT secret is not configured');
      this.logger.debug('JWT secret is configured');
      const payload = verifyToken(token, this.jwtSecret);
      this.logger.debug('Token verified successfully', { payload });
      return { userId: payload.userId };
    } catch (error) {
      this.logger.error('Error verifying token', error as Error);
      throw new Error('Invalid or expired token');
    }
  }

  public async register(email: string, password: string): Promise<IAuthPayload> {
    this.logger.info('Registering user', { email });
    if (!email || !password) {
      this.logger.error('Email and password are required for registration');
      throw new Error('Email and password are required');
    }
    this.logger.debug('Email and password provided', { email });
    if (!this.jwtSecret) {
      this.logger.error('JWT secret is not configured');
      throw new Error('JWT secret is not configured');
    }
    this.logger.debug('JWT secret is configured');
    const existing = await getUserByEmail(email, this.tableName);
    if (existing) {
      this.logger.error('User already exists');
      throw new Error('User already exists');
    }

    const hashed = await hashPassword(password);
    await createUser(email,email, hashed, this.tableName);

    const token = signToken({ userId: email }, this.jwtSecret, this.tokenExpiry);
    this.logger.debug('User registered successfully', { email });
    this.logger.info('User registration successful');
    return { email, token };
  }

  public async login(email: string, password: string): Promise<IAuthPayload> {
    const user = await getUserByEmail(email, this.tableName);
    if (!user) {
      this.logger.error('User not found');
      throw new Error('User not found');
    }
    if (!(await comparePassword(password, user.passwordHash))) {
      this.logger.error('Invalid credentials');
      throw new Error('Invalid credentials');
    }
    const token = signToken({ userId: user.email }, this.jwtSecret, this.tokenExpiry);
    this.logger.debug('User logged in successfully', { email });
    this.logger.info('User login successful');
    return { email: user.email, token };
  }
}