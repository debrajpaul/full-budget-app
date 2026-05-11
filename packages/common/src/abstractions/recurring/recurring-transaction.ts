import { ETenantType } from "../users";

export enum ERecurringFrequency {
  monthly = "monthly",
  weekly = "weekly",
  biweekly = "biweekly",
  yearly = "yearly",
}

export enum ETransactionType {
  income = "INCOME",
  expense = "EXPENSE",
}

/**
 * Infer TransactionType from category bucket first, amount sign as fallback.
 * Category "INCOME" → INCOME. Any other recognised category → EXPENSE.
 * Unclassified / transfer / absent category → amount > 0 is INCOME, else EXPENSE.
 */
export function inferTransactionType(
  amount: number,
  category?: string
): ETransactionType {
  if (category) {
    const cat = category.toUpperCase();
    if (cat === "INCOME") return ETransactionType.income;
    if (cat !== "UNCLASSIFIED" && cat !== "TRANSFER") {
      return ETransactionType.expense;
    }
  }
  return amount > 0 ? ETransactionType.income : ETransactionType.expense;
}

export interface IRecurringTransaction {
  tenantId: ETenantType;
  userId: string;
  recurringId: string;
  description: string;
  amount: number;
  category?: string;
  type?: ETransactionType; // optional for backward-compat; inferred at read if absent
  frequency: ERecurringFrequency;
  // Scheduling fields (not all used for every frequency)
  dayOfMonth?: number; // 1-31, for monthly/yearly
  dayOfWeek?: number; // 0-6 (Sun-Sat), for weekly
  monthOfYear?: number; // 1-12, for yearly
  startDate: string; // ISO date (inclusive)
  endDate?: string; // ISO date (inclusive)
  nextRunDate?: string; // ISO date for next materialization (optional helper)
  createdAt: string;
  updatedAt?: string;
  deletedAt?: string;
}
