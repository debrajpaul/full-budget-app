export interface IUser {
  userId: string;
  email: string;
  name: string;
  passwordHash: string;
  createdAt: Date;
  updatedAt: Date;
  deletedAt?: Date;
  isActive: boolean;
  lastLogin?: Date;
}