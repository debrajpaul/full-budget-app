import { ITransaction } from "./transaction";

export interface ITransactionStore {
  saveTransactions(
    tenantId: string,
    txns: Omit<ITransaction, "createdAt" | "tenantId">[],
  ): Promise<void>;
  getUserTransactions(
    tenantId: string,
    userId: string,
  ): Promise<ITransaction[]>;
  getTransactionsByDateRange(
    tenantId: string,
    userId: string,
    startDate: string,
    endDate: string,
  ): Promise<ITransaction[]>;
  updateTransactionCategory(
    tenantId: string,
    transactionId: string,
    matchedCategory: string,
  ): Promise<void>;
}
