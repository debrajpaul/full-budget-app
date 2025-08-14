import { ETenantType } from "../users";
import { EBankName } from "../bank-parser";
export interface ITransaction {
  tenantId: ETenantType;
  userId: string;
  transactionId: string;
  bankName: EBankName;
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
