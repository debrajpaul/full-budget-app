export interface IUser {
  email: string;
  name: string;
  passwordHash: string;
  createdAt: Date;
  updatedAt: Date;
  deletedAt?: Date;
  isActive: boolean;
  lastLogin?: Date;
}

export interface IUserUpdate {
  name?: string;
  email?: string;
  passwordHash?: string;
  lastLogin?: Date;
  isActive?: boolean;
  deletedAt?: Date | null;
}
