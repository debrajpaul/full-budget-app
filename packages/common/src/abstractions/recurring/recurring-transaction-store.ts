import { IRecurringTransaction } from "./recurring-transaction";
import { ETenantType } from "../users";

export interface IRecurringTransactionStore {
  create(
    tenantId: ETenantType,
    recurring: Omit<IRecurringTransaction, "tenantId" | "createdAt">
  ): Promise<IRecurringTransaction>;
  listByUser(
    tenantId: ETenantType,
    userId: string
  ): Promise<IRecurringTransaction[]>;
}
