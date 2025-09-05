import { mock } from "jest-mock-extended";
import {
  ILogger,
  ETenantType,
  ITransactionStore,
  EBaseCategories,
} from "@common";
import { BudgetService } from "./budget-service";
import { BudgetStore } from "@db";

describe("BudgetService - default recommended budgets", () => {
  const tenantId = ETenantType.default;
  const userId = "user-1";
  const month = 8;
  const year = 2025;

  let logger: ReturnType<typeof mock<ILogger>>;
  let budgetStore: Pick<BudgetStore, "getBudgetsByPeriod" | "setBudget">;
  let transactionStore: Pick<ITransactionStore, "aggregateSpendByCategory">;

  beforeEach(() => {
    logger = mock<ILogger>();
    budgetStore = {
      // Default: no budgets saved
      getBudgetsByPeriod: jest.fn().mockResolvedValue({}),
      setBudget: jest.fn() as any,
    } as any;
    transactionStore = {
      aggregateSpendByCategory: jest.fn(),
    } as any;
  });

  it("provides 80/20 default budgets when none exist and income > 0", async () => {
    (transactionStore.aggregateSpendByCategory as jest.Mock).mockResolvedValue({
      [EBaseCategories.income]: 5000,
      [EBaseCategories.expenses]: -3200,
    });

    const svc = new BudgetService(
      logger,
      budgetStore as BudgetStore,
      transactionStore as ITransactionStore,
    );

    const deviations = await svc.analyzeSpend(tenantId, userId, month, year);
    const byCat = Object.fromEntries(
      deviations.map((d) => [d.category, d.recommended]),
    );

    expect(byCat[EBaseCategories.expenses]).toBe(-4000); // 80% of 5000
    expect(byCat[EBaseCategories.savings]).toBe(-1000); // 20% of 5000
  });

  it("does not apply defaults when budgets exist", async () => {
    (budgetStore.getBudgetsByPeriod as jest.Mock).mockResolvedValue({
      [EBaseCategories.expenses]: -2000,
    });
    (transactionStore.aggregateSpendByCategory as jest.Mock).mockResolvedValue({
      [EBaseCategories.income]: 5000,
      [EBaseCategories.expenses]: -1800,
    });

    const svc = new BudgetService(
      logger,
      budgetStore as BudgetStore,
      transactionStore as ITransactionStore,
    );

    const deviations = await svc.analyzeSpend(tenantId, userId, month, year);
    const expensesDev = deviations.find(
      (d) => d.category === EBaseCategories.expenses,
    );
    expect(expensesDev?.recommended).toBe(-2000);

    const savingsDev = deviations.find(
      (d) => d.category === EBaseCategories.savings,
    );
    expect(savingsDev).toBeUndefined();
  });

  it("handles no income gracefully (no defaults)", async () => {
    (transactionStore.aggregateSpendByCategory as jest.Mock).mockResolvedValue(
      {},
    );

    const svc = new BudgetService(
      logger,
      budgetStore as BudgetStore,
      transactionStore as ITransactionStore,
    );

    const deviations = await svc.analyzeSpend(tenantId, userId, month, year);
    expect(deviations.length).toBe(0);
  });
});
