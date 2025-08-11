import { IUser, IUserUpdate } from "./index";

export interface IUserStore {
  getUser(tenantId: string, email: string): Promise<IUser | undefined>;
  saveUser(user: IUser): Promise<void>;
  updateUser(tenantId: string, input: IUserUpdate): Promise<void>;
}
