import { ITransaction } from "./transaction";
import { ETenantType } from "../users";
import { EBaseCategories } from "../categories";

export interface ITransactionStore {
  saveTransactions(
    tenantId: ETenantType,
    txns: Omit<ITransaction, "createdAt" | "tenantId">[],
  ): Promise<void>;
  getUserTransactions(
    tenantId: ETenantType,
    userId: string,
  ): Promise<ITransaction[]>;
  getTransactionsByDateRange(
    tenantId: ETenantType,
    userId: string,
    startDate: string,
    endDate: string,
  ): Promise<ITransaction[]>;
  updateTransactionCategory(
    tenantId: ETenantType,
    transactionId: string,
    matchedCategory: EBaseCategories,
    taggedBy?: string,
    confidence?: number,
    embedding?: number[],
  ): Promise<void>;
}
