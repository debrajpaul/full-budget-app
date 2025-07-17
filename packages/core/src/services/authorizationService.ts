import { createUser, getUserByEmail } from '@db/models';
import { IAuthorizationService, IAuthPayload } from '@core/abstractions';
import { signToken, verifyToken } from '@auth/jwt';
import { hashPassword, comparePassword} from "@auth/password";

export class AuthorizationService implements IAuthorizationService {

  constructor(
    private jwtSecret: string, 
    private tokenExpiry: number
  ) {}

  public async verifyToken(token: string): Promise<{ userId: string }> {
    try {
      const payload = verifyToken(token, this.jwtSecret);
      return { userId: payload.userId };
    } catch (error) {
      throw new Error('Invalid or expired token');
    }
  }

  public async register(email: string, password: string): Promise<IAuthPayload> {
    const existing = await getUserByEmail(email);
    if (existing) throw new Error('User already exists');

    const hashed = await hashPassword(password);
    await createUser(email,email, hashed);

    const token = signToken({ userId: email }, this.jwtSecret, this.tokenExpiry);
    return { email, token };
  }

  public async login(email: string, password: string): Promise<IAuthPayload> {
    const user = await getUserByEmail(email);
    if (!user) throw new Error('User not found');
    if (!(await comparePassword(password, user.passwordHash))) throw new Error('Invalid credentials');
    const token = signToken({ userId: user.email }, this.jwtSecret, this.tokenExpiry);
    return { email: user.email, token };
  }
}