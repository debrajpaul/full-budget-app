import { ITransaction } from "./ITransaction";

export interface ITransactionStore {
  saveTransactions(txns: ITransaction[]): Promise<void>;
  getUserTransactions(userId: string): Promise<ITransaction[]>;
}
