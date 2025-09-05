import { ETenantType } from "../users";
import { IBudget, ISetBudgetInput } from "./budget";

export interface IBudgetService {
  setBudget(
    tenantId: ETenantType,
    userId: string,
    input: ISetBudgetInput,
  ): Promise<IBudget>;
}
