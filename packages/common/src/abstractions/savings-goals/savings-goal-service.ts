import { ETenantType } from "../users";
import { ISavingsGoal } from "./savings-goal";

export interface ISavingsGoalService {
  getSavingsGoals(
    tenantId: ETenantType,
    userId: string,
  ): Promise<ISavingsGoal[]>;
}
