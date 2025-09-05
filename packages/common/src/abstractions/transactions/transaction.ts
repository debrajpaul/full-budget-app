import { ETenantType } from "../users";
import { EBankName } from "../bank-parser";
import { 
  EBaseCategories,
  ESubSavingCategories,
  ESubExpenseCategories,
  ESubIncomeCategories,
  ESubInvestmentCategories,
  ESubLoanCategories,
} from "../categories";
export interface ITransaction {
  tenantId: ETenantType;
  userId: string;
  transactionId: string;
  bankName: EBankName;
  amount: number;
  balance?: number;
  txnDate: string | undefined;
  description?: string;
  category: EBaseCategories;
  subCategory?: ESubSavingCategories | ESubExpenseCategories | ESubIncomeCategories | ESubInvestmentCategories | ESubLoanCategories;
  embedding?: number[];
  taggedBy?: string;
  confidence?: number;
  type?: string;
  createdAt: string;
  updatedAt?: string;
  deletedAt?: string;
}
