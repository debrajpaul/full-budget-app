import { ETenantType } from "../users";
import {
  ISavingsGoal,
  ICreateSavingsGoalInput,
  IUpdateSavingsGoalInput,
  IContributeSavingsGoalInput,
} from "./savings-goal";

export interface ISavingsGoalService {
  getSavingsGoals(
    tenantId: ETenantType,
    userId: string
  ): Promise<ISavingsGoal[]>;

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
  ): Promise<boolean>;

  contributeSavingsGoal(
    tenantId: ETenantType,
    userId: string,
    input: IContributeSavingsGoalInput
  ): Promise<ISavingsGoal>;
}
