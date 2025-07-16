export interface IAuthPayload {
    email: string;
    token: string;
  }
  
export interface IAuthorizationService {
  register(email: string, password: string): Promise<IAuthPayload>;
  login(email: string, password: string): Promise<IAuthPayload>;
  verifyToken(token: string): Promise<{ userId: string }>;
}
