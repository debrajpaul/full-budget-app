import { ETenantType } from "../users";

export enum EBaseCategories {
  savings = "SAVINGS",
  expenses = "EXPENSES",
  income = "INCOME",
  transfer = "TRANSFER",
  loan = "LOAN",
  investment = "INVESTMENT",
  unclassified = "UNCLASSIFIED",
}

export enum ESubSavingCategories {
  retirement = "RETIREMENT",
  emergency = "EMERGENCY",
  education = "EDUCATION",
  travel = "TRAVEL",
  health = "HEALTH",
}

export enum ESubExpenseCategories {
  housing = "HOUSING",
  transportation = "TRANSPORTATION",
  food = "FOOD",
  utilities = "UTILITIES",
  healthcare = "HEALTHCARE",
}

export enum ESubIncomeCategories {
  salary = "SALARY",
  business = "BUSINESS",
  investment = "INVESTMENT",
  freelance = "FREELANCE",
}

export enum ESubInvestmentCategories {
  stocks = "STOCKS",
  bonds = "BONDS",
  realEstate = "REAL_ESTATE",
  mutualFunds = "MUTUAL_FUNDS",
}

export enum ESubLoanCategories {
  personal = "PERSONAL",
  mortgage = "MORTGAGE",
  auto = "AUTO",
  student = "STUDENT",
}

// Union of all supported sub-category enums
export type EAllSubCategories =
  | ESubExpenseCategories
  | ESubSavingCategories
  | ESubIncomeCategories
  | ESubInvestmentCategories
  | ESubLoanCategories;

export interface ICategoryRules {
  ruleId: string;
  tenantId: ETenantType;
  match: RegExp;
  category: EBaseCategories;
  subCategory?: EAllSubCategories; // Optional detailed sub-category
  taggedBy: string;
  when?: "CREDIT" | "DEBIT" | "ANY";
  reason?: string;
  confidence?: number;
  createdAt: string;
  updatedAt?: string;
  deletedAt?: string;
}
