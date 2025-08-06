import { ITransaction } from "./transaction";

export interface ITransactionStore {
  saveTransactions(txns: Omit<ITransaction, "createdAt">[]): Promise<void>;
  getUserTransactions(userId: string): Promise<ITransaction[]>;
  getTransactionsByDateRange(
    userId: string,
    startDate: string,
    endDate: string,
  ): Promise<ITransaction[]>;
}
