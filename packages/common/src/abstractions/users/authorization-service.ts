export interface IRegisterInput {
  email: string;
  tenantId: string;
  name: string;
  password: string;
}

export interface IRegisterResponse {
  success: boolean;
  message: string;
}

export interface ILoginInput {
  email: string;
  tenantId: string;
  password: string;
}

export interface User {
  email: string;
  name: string;
  tenantId: string;
  isActive: boolean;
}
export interface ILoginResponse {
  user: User;
  token: string;
}

export interface IAuthorizationService {
  register(registerInput: IRegisterInput): Promise<IRegisterResponse>;
  login(loginInput: ILoginInput): Promise<ILoginResponse>;
  verifyToken(token: string): Promise<{ email: string }>;
}
