import { ETenantType } from "../users";
import {
  EBaseCategories,
} from "../categories";

export interface IBudget {
  tenantId: ETenantType;
  budgetId: string;
  userId: string;
  year: number;
  month: number;
  category: EBaseCategories;
  subCategory?: string; // Optional detailed sub-category
  amount: number;
  createdAt: string;
  updatedAt?: string;
}

export interface ISetBudgetInput {
  month: number;
  year: number;
  category: EBaseCategories;
  subCategory?: string; // Optional detailed sub-category
  amount: number;
}
