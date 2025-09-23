import { ETenantType } from "../users";
import { EBankName } from "../bank-parser";
import { EBaseCategories } from "../categories";
export interface ITransaction {
  tenantId: ETenantType;
  userId: string;
  transactionId: string;
  bankName: EBankName;
  amount: number;
  balance?: number;
  txnDate: string | undefined;
  description?: string;
  category?: EBaseCategories;
  subCategory?: string; // Optional detailed sub-category
  embedding?: number[];
  taggedBy?: string;
  reason?: string;
  confidence?: number;
  type?: string;
  createdAt: string;
  updatedAt?: string;
  deletedAt?: string;
}
