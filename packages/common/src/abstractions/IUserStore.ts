import { IUser, IUserUpdate } from "./index";

export interface IUserStore {
  getUser(email: string): Promise<IUser | undefined>;
  saveUser(user: IUser): Promise<void>;
  updateUser(input: IUserUpdate): Promise<void>;
}
