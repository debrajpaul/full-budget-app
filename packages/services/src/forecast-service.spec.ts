import { ForecastService } from "./forecast-service";
import { mock } from "jest-mock-extended";
import {
  ILogger,
  IRecurringTransactionStore,
  IRecurringTransaction,
  ERecurringFrequency,
  ETenantType,
} from "@common";

describe("ForecastService", () => {
  const tenantId = ETenantType.default;
  const userId = "user-1";

  function makeRecurring(
    partial: Partial<IRecurringTransaction> &
      Required<
        Pick<
          IRecurringTransaction,
          "recurringId" | "description" | "amount" | "frequency" | "startDate"
        >
      >,
  ): IRecurringTransaction {
    return {
      tenantId,
      userId,
      category: undefined,
      dayOfMonth: undefined,
      dayOfWeek: undefined,
      monthOfYear: undefined,
      endDate: undefined,
      nextRunDate: undefined,
      updatedAt: undefined,
      deletedAt: undefined,
      createdAt: new Date().toISOString(),
      ...partial,
    } as IRecurringTransaction;
  }

  it("projects monthly inflow/outflow and running balance with alerts", async () => {
    const logger = mock<ILogger>();
    const store = mock<IRecurringTransactionStore>();
    const service = new ForecastService(logger, store);

    const recurrences: IRecurringTransaction[] = [
      // Salary on 1st: +3000
      makeRecurring({
        recurringId: `${userId}#sal`,
        description: "Salary",
        amount: 3000,
        frequency: ERecurringFrequency.monthly,
        dayOfMonth: 1,
        startDate: "2024-01-01",
      }),
      // Rent on 5th: -1200
      makeRecurring({
        recurringId: `${userId}#rent`,
        description: "Rent",
        amount: -1200,
        frequency: ERecurringFrequency.monthly,
        dayOfMonth: 5,
        startDate: "2024-01-01",
      }),
    ];
    store.listByUser.mockResolvedValue(recurrences);

    const result = await service.forecastMonth(tenantId, userId, 2025, 9, {
      startingBalance: 500,
      lowBalanceThreshold: 200,
      largeExpenseThreshold: 1000,
    });

    // Ending balance = 500 + 3000 - 1200
    expect(result.endingBalance).toBe(2300);

    const day1 = result.days.find((d) => d.date.endsWith("-09-01"))!;
    expect(day1.inflow).toBe(3000);
    expect(day1.outflow).toBe(0);
    expect(day1.net).toBe(3000);
    expect(day1.runningBalance).toBe(3500);

    const day5 = result.days.find((d) => d.date.endsWith("-09-05"))!;
    expect(day5.inflow).toBe(0);
    expect(day5.outflow).toBe(-1200);
    expect(day5.net).toBe(-1200);

    // Alerts should include a LARGE_EXPENSE on the 5th (>= 1000)
    expect(
      result.alerts.some(
        (a) => a.type === "LARGE_EXPENSE" && a.date.endsWith("-09-05"),
      ),
    ).toBe(true);
    // No low balance alerts since running balance stays above 200
    expect(result.alerts.some((a) => a.type === "LOW_BALANCE")).toBe(false);
  });

  it("emits LOW_BALANCE critical alert when balance goes negative", async () => {
    const logger = mock<ILogger>();
    const store = mock<IRecurringTransactionStore>();
    const service = new ForecastService(logger, store);

    const recurrences: IRecurringTransaction[] = [
      makeRecurring({
        recurringId: `${userId}#bill`,
        description: "Bill",
        amount: -500,
        frequency: ERecurringFrequency.monthly,
        dayOfMonth: 2,
        startDate: "2024-01-01",
      }),
    ];
    store.listByUser.mockResolvedValue(recurrences);

    const result = await service.forecastMonth(tenantId, userId, 2025, 9, {
      startingBalance: 0,
      lowBalanceThreshold: 100,
    });

    // On day 2, running balance should be -500, triggering critical low balance
    const lowAlerts = result.alerts.filter((a) => a.type === "LOW_BALANCE");
    expect(lowAlerts.length).toBeGreaterThanOrEqual(1);
    expect(lowAlerts.some((a) => a.severity === "critical")).toBe(true);
  });
});
