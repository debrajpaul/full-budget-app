import { IUser, IUserUpdate, ETenantType } from "./index";

export interface IUserStore {
  getUser(tenantId: ETenantType, email: string): Promise<IUser | undefined>;
  saveUser(user: IUser): Promise<void>;
  updateUser(tenantId: ETenantType, input: IUserUpdate): Promise<void>;
}
