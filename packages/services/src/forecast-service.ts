import {
  ILogger,
  ETenantType,
  IForecastService,
  IForecastResult,
  IForecastDay,
  IForecastAlert,
  IRecurringTransactionStore,
  IRecurringTransaction,
  ERecurringFrequency,
} from "@common";

function daysInMonth(year: number, month: number): number {
  return new Date(year, month, 0).getDate();
}

function iso(year: number, month: number, day: number): string {
  const mm = String(month).padStart(2, "0");
  const dd = String(day).padStart(2, "0");
  return `${year}-${mm}-${dd}`;
}

function clampDayOfMonth(year: number, month: number, day: number): number {
  const last = daysInMonth(year, month);
  return Math.min(day, last);
}

function computeOccurrences(
  r: IRecurringTransaction,
  month: number,
  year: number,
): string[] {
  switch (r.frequency) {
    case ERecurringFrequency.monthly: {
      const day = clampDayOfMonth(year, month, r.dayOfMonth || 1);
      return [iso(year, month, day)];
    }
    case ERecurringFrequency.weekly: {
      const dow = r.dayOfWeek ?? 1;
      const dates: string[] = [];
      const d = new Date(year, month - 1, 1);
      while (d.getMonth() === month - 1) {
        if (d.getDay() === dow) {
          dates.push(iso(d.getFullYear(), d.getMonth() + 1, d.getDate()));
        }
        d.setDate(d.getDate() + 1);
      }
      return dates;
    }
    case ERecurringFrequency.biweekly: {
      const start = new Date(r.startDate);
      const targetDOW = r.dayOfWeek ?? start.getDay();
      const anchor = new Date(start);
      const delta = (targetDOW - anchor.getDay() + 7) % 7;
      anchor.setDate(anchor.getDate() + delta);

      const first = new Date(year, month - 1, 1);
      const last = new Date(year, month, 0);
      let current = new Date(anchor);
      while (current < first) current.setDate(current.getDate() + 14);
      const adjust = (targetDOW - current.getDay() + 7) % 7;
      current.setDate(current.getDate() + adjust);
      const dates: string[] = [];
      while (current <= last) {
        dates.push(
          iso(current.getFullYear(), current.getMonth() + 1, current.getDate()),
        );
        current.setDate(current.getDate() + 14);
      }
      return dates;
    }
    case ERecurringFrequency.yearly: {
      const m = r.monthOfYear ?? 1;
      if (m !== month) return [];
      const day = clampDayOfMonth(year, month, r.dayOfMonth || 1);
      return [iso(year, month, day)];
    }
    default:
      return [];
  }
}

export class ForecastService implements IForecastService {
  private readonly logger: ILogger;
  private readonly recurringStore: IRecurringTransactionStore;

  constructor(logger: ILogger, recurringStore: IRecurringTransactionStore) {
    this.logger = logger;
    this.recurringStore = recurringStore;
  }

  async forecastMonth(
    tenantId: ETenantType,
    userId: string,
    year: number,
    month: number,
    options?: {
      startingBalance?: number;
      lowBalanceThreshold?: number;
      largeExpenseThreshold?: number;
    },
  ): Promise<IForecastResult> {
    const startBal = options?.startingBalance ?? 0;
    const lowThreshold = options?.lowBalanceThreshold ?? 0;
    const largeExpenseThreshold = options?.largeExpenseThreshold ?? 200; // default signal

    // Start with empty days for the month
    const totalDays = daysInMonth(year, month);
    const days: IForecastDay[] = Array.from({ length: totalDays }, (_, i) => ({
      date: iso(year, month, i + 1),
      inflow: 0,
      outflow: 0,
      net: 0,
      runningBalance: undefined,
    }));

    // Pull recurring rules and apply occurrences
    const recurrences = await this.recurringStore.listByUser(tenantId, userId);
    for (const r of recurrences) {
      const dates = computeOccurrences(r, month, year);
      for (const d of dates) {
        const idx = parseInt(d.split("-")[2], 10) - 1;
        if (idx >= 0 && idx < days.length) {
          const amt = r.amount;
          if (amt >= 0) days[idx].inflow += amt;
          else days[idx].outflow += amt; // negative amounts accumulate to outflow
        }
      }
    }

    // Compute nets and running balance
    const alerts: IForecastAlert[] = [];
    let running = startBal;
    for (const d of days) {
      d.net = d.inflow + d.outflow; // outflow is negative
      running += d.net;
      d.runningBalance = running;
      // Alerts
      if (running < lowThreshold) {
        alerts.push({
          date: d.date,
          type: "LOW_BALANCE",
          message: `Projected balance ${running.toFixed(2)} falls below ${lowThreshold}`,
          severity: running < 0 ? "critical" : "warning",
        });
      }
      const absOutflow = Math.abs(d.outflow);
      if (absOutflow >= largeExpenseThreshold) {
        alerts.push({
          date: d.date,
          type: "LARGE_EXPENSE",
          message: `Large projected outflow ${absOutflow.toFixed(2)}`,
          severity: "info",
        });
      }
    }

    const result: IForecastResult = {
      month,
      year,
      startingBalance: startBal,
      endingBalance: running,
      days,
      alerts,
    };

    return result;
  }
}
