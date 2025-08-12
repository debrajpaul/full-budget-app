export enum ETenantType {
  personal = "PERSONAL",
  client = "CLIENT",
  // government = "GOVERNMENT",
  // ngo = "NGO",
  // educational = "EDUCATIONAL",
  default = "DEFAULT",
}
export interface IUser {
  tenantId: ETenantType;
  email: string;
  name: string;
  passwordHash: string;
  createdAt: string;
  updatedAt?: string;
  deletedAt?: string;
  isActive: boolean;
  lastLogin?: string;
}

export interface IUserUpdate {
  name?: string;
  email?: string;
  passwordHash?: string;
  lastLogin?: string;
  isActive?: boolean;
  deletedAt?: string | null;
}
