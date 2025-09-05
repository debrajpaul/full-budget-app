import { ETenantType } from "../users";
import { 
  EBaseCategories,
  ESubSavingCategories,
  ESubExpenseCategories,
  ESubIncomeCategories,
  ESubInvestmentCategories,
  ESubLoanCategories,
} from "../categories";

export interface IBudget {
  tenantId: ETenantType;
  budgetId: string;
  userId: string;
  year: number;
  month: number;
  category: EBaseCategories;
  subCategory?: ESubSavingCategories | ESubExpenseCategories | ESubIncomeCategories | ESubInvestmentCategories | ESubLoanCategories;
  amount: number;
  createdAt: string;
  updatedAt?: string;
}

export interface ISetBudgetInput {
  month: number;
  year: number;
  category: string;
  amount: number;
}

