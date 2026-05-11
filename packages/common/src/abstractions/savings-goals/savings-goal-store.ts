import { ETenantType } from "../users";
import {
  ISavingsGoal,
  ICreateSavingsGoalInput,
  IUpdateSavingsGoalInput,
} from "./savings-goal";

export interface ISavingsGoalStore {
  listSavingsGoals(
    tenantId: ETenantType,
    userId: string
  ): Promise<ISavingsGoal[]>;

  getSavingsGoalById(
    tenantId: ETenantType,
    userId: string,
    id: string
  ): Promise<ISavingsGoal | null>;

  createSavingsGoal(
    tenantId: ETenantType,
    userId: string,
    input: ICreateSavingsGoalInput
  ): Promise<ISavingsGoal>;

  updateSavingsGoal(
    tenantId: ETenantType,
    userId: string,
    id: string,
    input: IUpdateSavingsGoalInput
  ): Promise<ISavingsGoal>;

  deleteSavingsGoal(
    tenantId: ETenantType,
    userId: string,
    id: string
  ): Promise<void>;

  addContribution(
    tenantId: ETenantType,
    userId: string,
    id: string,
    amount: number,
    date: string
  ): Promise<ISavingsGoal>;
}
