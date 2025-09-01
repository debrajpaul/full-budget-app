import { ETenantType } from "../users";

export enum ERecurringFrequency {
  monthly = "monthly",
  weekly = "weekly",
  yearly = "yearly",
}

export interface IRecurringTransaction {
  tenantId: ETenantType;
  userId: string;
  recurringId: string;
  description: string;
  amount: number;
  category?: string;
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
