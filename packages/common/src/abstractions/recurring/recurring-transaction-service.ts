import { ITransaction } from "../transactions";
import { ETenantType } from "../users";
import {
  ERecurringFrequency,
  ETransactionType,
  IRecurringTransaction,
} from "./recurring-transaction";

export interface IRecurringTransactionService {
  create(
    tenantId: ETenantType,
    userId: string,
    payload: {
      description: string;
      amount: number;
      category?: string;
      type?: ETransactionType;
      frequency: ERecurringFrequency;
      dayOfMonth?: number;
      dayOfWeek?: number;
      monthOfYear?: number;
      startDate: string;
      endDate?: string;
    }
  ): Promise<IRecurringTransaction>;

  list(tenantId: ETenantType, userId: string): Promise<IRecurringTransaction[]>;

  materializeForMonth(
    tenantId: ETenantType,
    userId: string,
    month: number,
    year: number
  ): Promise<ITransaction[]>;
}
