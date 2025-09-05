import { ETenantType } from "../users";
import {
  EBaseCategories,
  ESubSavingCategories,
  ESubExpenseCategories,
  ESubIncomeCategories,
  ESubInvestmentCategories,
  ESubLoanCategories,
} from "../categories";

export interface ITransactionCategoryRequest {
  tenantId: ETenantType;
  transactionId: string;
  description?: string;
  category?: EBaseCategories;
  subCategory?:
    | ESubSavingCategories
    | ESubExpenseCategories
    | ESubIncomeCategories
    | ESubInvestmentCategories
    | ESubLoanCategories;
  createdAt: string;
  embedding?: number[];
  taggedBy?: string;
  confidence?: number;
}

export interface ITransactionCategoryService {
  process(request: ITransactionCategoryRequest): Promise<boolean>;
  addRulesByTenant(tenantId: ETenantType): Promise<void>;
}
