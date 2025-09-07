import { ETenantType } from "../users";
import { IBudget, ISetBudgetInput } from "./budget";
import {
  EBaseCategories,
  ESubSavingCategories,
  ESubExpenseCategories,
  ESubIncomeCategories,
  ESubInvestmentCategories,
  ESubLoanCategories,
} from "../categories";

export interface ICategoryDeviation {
  category: EBaseCategories;
  subCategory?:
    | ESubSavingCategories
    | ESubExpenseCategories
    | ESubIncomeCategories
    | ESubInvestmentCategories
    | ESubLoanCategories;
  recommended: number;
  actual: number;
  difference: number; // positive = overspend, negative = underspend
  percentage: number; // difference / recommended * 100
}

export interface IBudgetService {
  setBudget(
    tenantId: ETenantType,
    userId: string,
    input: ISetBudgetInput,
  ): Promise<IBudget>;

  analyzeSpend(
    tenantId: ETenantType,
    userId: string,
    month: number,
    year: number,
  ): Promise<ICategoryDeviation[]>;

  // Aggregate budgets and actuals for the full year
  analyzeAnnualSpend(
    tenantId: ETenantType,
    userId: string,
    year: number,
  ): Promise<ICategoryDeviation[]>;
}
