import { ETenantType } from "../users";
import { EBankName, EBankType } from "../bank-parser";
import { EBaseCategories } from "../categories";
export interface ITransaction {
  tenantId: ETenantType;
  userId: string;
  transactionId: string;
  bankName: EBankName;
  bankType: EBankType;
  description: string;
  txnDate: string | undefined;
  credit: number;
  debit: number;
  balance?: number;
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
