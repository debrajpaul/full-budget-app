export interface ITransaction {
  userId: string;
  transactionId: string;
  bankName: string;
  amount: number;
  balance?: number;
  txnDate: string;
  description?: string;
  category?: string;
  type?: string;
  createdAt: Date;
  updatedAt: Date;
  deletedAt?: Date;
}
