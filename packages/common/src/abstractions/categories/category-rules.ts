import { ETenantType } from "../users";

export enum EBaseCategories {
  savings = "SAVINGS",
  expenses = "EXPENSES",
  income = "INCOME",
  default = "DEFAULT",
}

// export enum ESubSavingCategories {
//   retirement = "RETIREMENT",
//   emergency = "EMERGENCY",
//   education = "EDUCATION",
//   travel = "TRAVEL",
//   health = "HEALTH",
//   default = "DEFAULT",
// }

// export enum ESubExpenseCategories {
//   housing = "HOUSING",
//   transportation = "TRANSPORTATION",
//   food = "FOOD",
//   utilities = "UTILITIES",
//   healthcare = "HEALTHCARE",
//   default = "DEFAULT",
// }

// export enum ESubIncomeCategories {
//   salary = "SALARY",
//   business = "BUSINESS",
//   investment = "INVESTMENT",
//   freelance = "FREELANCE",
//   default = "DEFAULT",
// }

// export enum ESubInvestmentCategories {
//   stocks = "STOCKS",
//   bonds = "BONDS",
//   realEstate = "REAL_ESTATE",
//   mutualFunds = "MUTUAL_FUNDS",
//   default = "DEFAULT",
// }

// export enum ESubLoanCategories {
//   personal = "PERSONAL",
//   mortgage = "MORTGAGE",
//   auto = "AUTO",
//   student = "STUDENT",
//   default = "DEFAULT",
// }

export interface ICategoryRules {
  ruleId: string;
  tenantId: ETenantType;
  keyword: string;
  category: EBaseCategories;
  subCategory?: string; // Optional detailed sub-category
  isActive: boolean;
  createdAt: string;
  updatedAt?: string;
  deletedAt?: string;
}
