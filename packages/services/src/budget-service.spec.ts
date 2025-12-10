import { mock } from "jest-mock-extended";
import {
  ILogger,
  ETenantType,
  ITransactionStore,
  EBaseCategories,
  IBudget,
} from "@common";
import { BudgetService } from "./budget-service";
import { BudgetStore } from "@db";

describe("BudgetService - setBudget validations", () => {
  const tenantId = ETenantType.default;
  const userId = "user-1";
  let logger: ReturnType<typeof mock<ILogger>>;
  let budgetStore: Pick<BudgetStore, "setBudget" | "getBudgetsByPeriod">;
  let transactionStore: Pick<ITransactionStore, "aggregateSpendByCategory">;
  const baseBudget: IBudget = {
    tenantId,
    budgetId: "budget-123",
    userId,
    year: 2024,
    month: 5,
    category: EBaseCategories.expenses,
    amount: 100,
    createdAt: new Date().toISOString(),
  };

  beforeEach(() => {
    logger = mock<ILogger>();
    budgetStore = {
      getBudgetsByPeriod: jest.fn(),
      setBudget: jest.fn().mockResolvedValue(baseBudget),
    } as any;
    transactionStore = {
      aggregateSpendByCategory: jest.fn(),
    } as any;
  });

  it("persists a valid budget", async () => {
    const svc = new BudgetService(
      logger,
      budgetStore as BudgetStore,
      transactionStore as ITransactionStore
    );

    const response = await svc.setBudget(tenantId, userId, {
      month: 5,
      year: 2024,
      category: EBaseCategories.expenses,
      subCategory: "groceries",
      amount: 250,
    });

    expect(budgetStore.setBudget).toHaveBeenCalledWith(
      tenantId,
      userId,
      2024,
      5,
      EBaseCategories.expenses,
      250
    );
    expect(response).toEqual(baseBudget);
  });

  it("validates month boundaries", async () => {
    const svc = new BudgetService(
      logger,
      budgetStore as BudgetStore,
      transactionStore as ITransactionStore
    );

    await expect(
      svc.setBudget(tenantId, userId, {
        month: 13,
        year: 2024,
        category: EBaseCategories.expenses,
        amount: 100,
      })
    ).rejects.toThrow("month must be an integer between 1 and 12");
  });

  it("validates year boundaries", async () => {
    const svc = new BudgetService(
      logger,
      budgetStore as BudgetStore,
      transactionStore as ITransactionStore
    );

    await expect(
      svc.setBudget(tenantId, userId, {
        month: 5,
        year: 1800,
        category: EBaseCategories.expenses,
        amount: 100,
      })
    ).rejects.toThrow("year must be a reasonable integer (1900-3000)");
  });

  it("requires a category", async () => {
    const svc = new BudgetService(
      logger,
      budgetStore as BudgetStore,
      transactionStore as ITransactionStore
    );

    await expect(
      svc.setBudget(tenantId, userId, {
        month: 5,
        year: 2024,
        category: "   " as EBaseCategories,
        amount: 100,
      })
    ).rejects.toThrow("category is required");
  });

  it("requires numeric amount", async () => {
    const svc = new BudgetService(
      logger,
      budgetStore as BudgetStore,
      transactionStore as ITransactionStore
    );

    await expect(
      svc.setBudget(tenantId, userId, {
        month: 5,
        year: 2024,
        category: EBaseCategories.expenses,
        amount: "100" as any,
      })
    ).rejects.toThrow("amount must be a number");
  });
});

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
      transactionStore as ITransactionStore
    );

    const deviations = await svc.analyzeSpend(tenantId, userId, month, year);
    const byCat = Object.fromEntries(
      deviations.map((d) => [d.category, d.recommended])
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
      transactionStore as ITransactionStore
    );

    const deviations = await svc.analyzeSpend(tenantId, userId, month, year);
    const expensesDev = deviations.find(
      (d) => d.category === EBaseCategories.expenses
    );
    expect(expensesDev?.recommended).toBe(-2000);

    const savingsDev = deviations.find(
      (d) => d.category === EBaseCategories.savings
    );
    expect(savingsDev).toBeUndefined();
  });

  it("handles no income gracefully (no defaults)", async () => {
    (transactionStore.aggregateSpendByCategory as jest.Mock).mockResolvedValue(
      {}
    );

    const svc = new BudgetService(
      logger,
      budgetStore as BudgetStore,
      transactionStore as ITransactionStore
    );

    const deviations = await svc.analyzeSpend(tenantId, userId, month, year);
    expect(deviations.length).toBe(0);
  });
});

describe("BudgetService - annual analyzeAnnualSpend", () => {
  const tenantId = ETenantType.default;
  const userId = "user-1";
  const year = 2025;

  let logger: ReturnType<typeof mock<ILogger>>;
  let budgetStore: Pick<BudgetStore, "getBudgetsByPeriod" | "setBudget">;
  let transactionStore: Pick<ITransactionStore, "aggregateSpendByCategory">;

  beforeEach(() => {
    logger = mock<ILogger>();
    budgetStore = {
      getBudgetsByPeriod: jest.fn().mockResolvedValue({}),
      setBudget: jest.fn() as any,
    } as any;
    transactionStore = {
      aggregateSpendByCategory: jest.fn().mockResolvedValue({}),
    } as any;
  });

  it("provides 80/20 defaults across the year when no budgets exist and income > 0", async () => {
    // Only January has income, others are zero -> annual income = 60000
    (transactionStore.aggregateSpendByCategory as jest.Mock).mockImplementation(
      async (_tenant: any, _user: any, month: number) => {
        if (month === 1) return { [EBaseCategories.income]: 60000 };
        return {};
      }
    );

    const svc = new BudgetService(
      logger,
      budgetStore as BudgetStore,
      transactionStore as ITransactionStore
    );

    const deviations = await svc.analyzeAnnualSpend(tenantId, userId, year);
    const byCat = Object.fromEntries(
      deviations.map((d) => [d.category, d.recommended])
    );

    expect(byCat[EBaseCategories.expenses]).toBe(-48000); // 80% of 60000
    expect(byCat[EBaseCategories.savings]).toBe(-12000); // 20% of 60000
  });

  it("sums monthly budgets across the year without applying defaults", async () => {
    // Budgets exist for 2 months: Jan and Feb
    (budgetStore.getBudgetsByPeriod as jest.Mock).mockImplementation(
      async (_tenant: any, _user: any, month: number) => {
        if (month === 1)
          return {
            [EBaseCategories.expenses]: -1000,
            [EBaseCategories.savings]: -200,
          };
        if (month === 2)
          return {
            [EBaseCategories.expenses]: -1500,
            [EBaseCategories.savings]: -300,
          };
        return {};
      }
    );
    // Actuals not important for recommended check, but provide some values
    (transactionStore.aggregateSpendByCategory as jest.Mock).mockResolvedValue({
      [EBaseCategories.expenses]: -2200,
      [EBaseCategories.income]: 3000,
    });

    const svc = new BudgetService(
      logger,
      budgetStore as BudgetStore,
      transactionStore as ITransactionStore
    );

    const deviations = await svc.analyzeAnnualSpend(tenantId, userId, year);
    const expensesDev = deviations.find(
      (d) => d.category === EBaseCategories.expenses
    );
    const savingsDev = deviations.find(
      (d) => d.category === EBaseCategories.savings
    );

    expect(expensesDev?.recommended).toBe(-2500); // -1000 + -1500
    expect(savingsDev?.recommended).toBe(-500); // -200 + -300
  });

  it("annual analysis handles no income gracefully (no defaults)", async () => {
    (transactionStore.aggregateSpendByCategory as jest.Mock).mockResolvedValue(
      {}
    );

    const svc = new BudgetService(
      logger,
      budgetStore as BudgetStore,
      transactionStore as ITransactionStore
    );

    const deviations = await svc.analyzeAnnualSpend(tenantId, userId, year);
    expect(deviations.length).toBe(0);
  });
});
