export interface ITransaction {
  tenantId: string;
  userId: string;
  transactionId: string;
  bankName: string;
  amount: number;
  balance?: number;
  txnDate: string | undefined;
  description?: string;
  category?: string;
  type?: string;
  createdAt: string;
  updatedAt?: string;
  deletedAt?: string;
}
