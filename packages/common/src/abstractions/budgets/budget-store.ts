import { ETenantType } from "../users";
import { IBudget } from "./budget";

export interface IBudgetStore {
  setBudget(
    tenantId: ETenantType,
    userId: string,
    year: number,
    month: number,
    category: string,
    amount: number,
  ): Promise<IBudget>;
}

