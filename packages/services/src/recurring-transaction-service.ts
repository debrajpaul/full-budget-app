import {
  ILogger,
  ETenantType,
  ITransaction,
  ITransactionStore,
  IRecurringTransactionStore,
  IRecurringTransactionService,
  IRecurringTransaction,
  ERecurringFrequency,
  EBankName,
} from "@common";

function clampDayOfMonth(year: number, month: number, day: number): number {
  const lastDay = new Date(year, month, 0).getDate();
  return Math.min(day, lastDay);
}

function toIsoDate(year: number, month: number, day: number): string {
  const mm = String(month).padStart(2, "0");
  const dd = String(day).padStart(2, "0");
  return `${year}-${mm}-${dd}`;
}

export class RecurringTransactionService
  implements IRecurringTransactionService
{
  private readonly logger: ILogger;
  private readonly recurringStore: IRecurringTransactionStore;
  private readonly transactionStore: ITransactionStore;

  constructor(
    logger: ILogger,
    recurringStore: IRecurringTransactionStore,
    transactionStore: ITransactionStore,
  ) {
    this.logger = logger;
    this.recurringStore = recurringStore;
    this.transactionStore = transactionStore;
  }

  async create(
    tenantId: ETenantType,
    userId: string,
    payload: {
      description: string;
      amount: number;
      category?: string;
      frequency: ERecurringFrequency;
      dayOfMonth?: number;
      dayOfWeek?: number;
      monthOfYear?: number;
      startDate: string;
      endDate?: string;
    },
  ): Promise<IRecurringTransaction> {
    const recurring: Omit<IRecurringTransaction, "tenantId" | "createdAt"> = {
      userId,
      recurringId: `${userId}#${Date.now()}`,
      description: payload.description,
      amount: payload.amount,
      category: payload.category,
      frequency: payload.frequency,
      dayOfMonth: payload.dayOfMonth,
      dayOfWeek: payload.dayOfWeek,
      monthOfYear: payload.monthOfYear,
      startDate: payload.startDate,
      endDate: payload.endDate,
      nextRunDate: payload.startDate,
    };
    return this.recurringStore.create(tenantId, recurring);
  }

  async list(tenantId: ETenantType, userId: string) {
    return this.recurringStore.listByUser(tenantId, userId);
  }

  async materializeForMonth(
    tenantId: ETenantType,
    userId: string,
    month: number,
    year: number,
  ): Promise<ITransaction[]> {
    const recurrences = await this.recurringStore.listByUser(tenantId, userId);
    const created: ITransaction[] = [];

    for (const r of recurrences) {
      // Skip if outside active window
      const occurrenceDates = this.computeOccurrenceDates(r, month, year);
      for (const dateStr of occurrenceDates) {
        const start = new Date(r.startDate);
        const end = r.endDate ? new Date(r.endDate) : undefined;
        const occ = new Date(dateStr);
        if (occ < start) continue;
        if (end && occ > end) continue;

        const txn: Omit<ITransaction, "createdAt" | "tenantId"> = {
          userId,
          transactionId: `${userId}#rec#${r.recurringId}#${dateStr}`,
          bankName: EBankName.other,
          amount: r.amount,
          balance: undefined,
          txnDate: dateStr,
          description: r.description,
          category: r.category,
          taggedBy: "SYSTEM",
          type: "recurring",
          embedding: undefined,
          confidence: undefined,
          updatedAt: undefined,
          deletedAt: undefined,
        } as any; // match store's expected optional fields

        try {
          await this.transactionStore.saveTransactions(tenantId, [txn]);
          created.push({
            ...(txn as any),
            tenantId,
            createdAt: new Date().toISOString(),
          });
        } catch (e) {
          // Duplicate or error. Duplicates are ignored silently.
          this.logger.debug("Skipping duplicate or failed recurring save", {
            id: txn.transactionId,
            error: (e as Error)?.message,
          });
        }
      }
    }
    return created;
  }

  private computeOccurrenceDates(
    r: IRecurringTransaction,
    month: number,
    year: number,
  ): string[] {
    switch (r.frequency) {
      case ERecurringFrequency.monthly: {
        const day = clampDayOfMonth(year, month, r.dayOfMonth || 1);
        return [toIsoDate(year, month, day)];
      }
      case ERecurringFrequency.weekly: {
        const dayOfWeek = r.dayOfWeek ?? 1; // default Monday
        const dates: string[] = [];
        const d = new Date(year, month - 1, 1);
        while (d.getMonth() === month - 1) {
          if (d.getDay() === dayOfWeek) {
            dates.push(
              toIsoDate(d.getFullYear(), d.getMonth() + 1, d.getDate()),
            );
          }
          d.setDate(d.getDate() + 1);
        }
        return dates;
      }
      case ERecurringFrequency.yearly: {
        const matchedMonth = r.monthOfYear ?? 1;
        if (matchedMonth !== month) return [];
        const day = clampDayOfMonth(year, month, r.dayOfMonth || 1);
        return [toIsoDate(year, month, day)];
      }
      default:
        return [];
    }
  }
}
