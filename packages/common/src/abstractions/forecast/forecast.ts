import { ETenantType } from "../users";

export interface IForecastDay {
  date: string; // ISO YYYY-MM-DD
  inflow: number;
  outflow: number;
  net: number; // inflow + outflow (outflow typically negative)
  runningBalance?: number;
}

export type AlertSeverity = "info" | "warning" | "critical";

export interface IForecastAlert {
  date: string; // ISO
  type: string; // e.g., LOW_BALANCE, LARGE_EXPENSE
  message: string;
  severity: AlertSeverity;
}

export interface IForecastResult {
  month: number; // 1-12
  year: number; // YYYY
  startingBalance: number;
  endingBalance: number;
  days: IForecastDay[];
  alerts: IForecastAlert[];
}

export interface IForecastService {
  forecastMonth(
    tenantId: ETenantType,
    userId: string,
    year: number,
    month: number,
    options?: {
      startingBalance?: number;
      lowBalanceThreshold?: number;
      largeExpenseThreshold?: number;
    }
  ): Promise<IForecastResult>;
}
