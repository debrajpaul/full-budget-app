import { ETenantType } from "../users";
import { IBudget } from "./budget";
import {
  EBaseCategories,
  ESubSavingCategories,
  ESubExpenseCategories,
  ESubIncomeCategories,
  ESubInvestmentCategories,
  ESubLoanCategories,
} from "../categories";

export interface IBudgetStore {
  setBudget(
    tenantId: ETenantType,
    userId: string,
    year: number,
    month: number,
    category: EBaseCategories,
    amount: number,
    subCategory?:
      | ESubSavingCategories
      | ESubExpenseCategories
      | ESubIncomeCategories
      | ESubInvestmentCategories
      | ESubLoanCategories,
  ): Promise<IBudget>;

  // Returns a map of category -> recommended amount for the given user/month/year
  getBudgetsByPeriod(
    tenantId: ETenantType,
    userId: string,
    month: number,
    year: number,
  ): Promise<Record<string, number>>;
}
