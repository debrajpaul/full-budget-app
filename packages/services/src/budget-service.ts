import {
  IBudgetService,
  ISetBudgetInput,
  IBudget,
  ILogger,
  ETenantType,
  ITransactionStore,
  ICategoryDeviation,
  EBaseCategories,
} from "@common";
import { BudgetStore } from "@db";

export class BudgetService implements IBudgetService {
  private readonly logger: ILogger;
  private readonly budgetStore: BudgetStore;
  private readonly transactionStore: ITransactionStore;

  constructor(
    logger: ILogger,
    budgetStore: BudgetStore,
    transactionStore: ITransactionStore,
  ) {
    this.logger = logger;
    this.budgetStore = budgetStore;
    this.transactionStore = transactionStore;
  }

  public async setBudget(
    tenantId: ETenantType,
    userId: string,
    input: ISetBudgetInput,
  ): Promise<IBudget> {
    const { month, year, category, amount, subCategory } = input;
    this.logger.info("Setting budget", {
      tenantId,
      userId,
      month,
      year,
      category,
      amount,
      subCategory,
    });

    if (!Number.isInteger(month) || month < 1 || month > 12) {
      throw new Error("month must be an integer between 1 and 12");
    }
    if (!Number.isInteger(year) || year < 1900 || year > 3000) {
      throw new Error("year must be a reasonable integer (1900-3000)");
    }
    if (!category || !category.trim()) {
      throw new Error("category is required");
    }
    // if (!subCategory || !subCategory.trim()) {
    //    throw new Error("subCategory is required");
    // }
    if (typeof amount !== "number") {
      throw new Error("amount must be a number");
    }

    return this.budgetStore.setBudget(
      tenantId,
      userId,
      year,
      month,
      category,
      amount,
    );
  }

  public async analyzeSpend(
    tenantId: ETenantType,
    userId: string,
    month: number,
    year: number,
  ): Promise<ICategoryDeviation[]> {
    this.logger.info("Analyzing spend vs. budget", {
      tenantId,
      userId,
      month,
      year,
    });

    const [budgets, actuals] = await Promise.all([
      this.budgetStore.getBudgetsByPeriod(tenantId, userId, month, year),
      this.transactionStore.aggregateSpendByCategory(
        tenantId,
        userId,
        month,
        year,
      ),
    ]);

    // Provide default recommended budgets for users without any saved budgets.
    // Uses a simplified 50/30/20 principle adapted to available base categories:
    // - 80% of income for EXPENSES (needs + wants combined)
    // - 20% of income for SAVINGS
    // Income budget is not set by default.
    if (Object.keys(budgets).length === 0) {
      const income = Number(actuals[EBaseCategories.income] || 0);
      if (income > 0) {
        const round2 = (n: number) => Number(n.toFixed(2));
        budgets[EBaseCategories.expenses] = -round2(income * 0.8);
        budgets[EBaseCategories.savings] = -round2(income * 0.2);
      }
    }

    const categories = new Set<EBaseCategories>(
      [...Object.keys(budgets), ...Object.keys(actuals)].map(
        (c) => c as EBaseCategories,
      ),
    );
    const deviations: ICategoryDeviation[] = [];

    for (const cat of categories) {
      const recommended = budgets[cat] || 0;
      const actual = actuals[cat] || 0;
      const difference = actual - recommended;
      const percentage = recommended ? (difference / recommended) * 100 : 0;
      deviations.push({
        category: cat as EBaseCategories,
        recommended,
        actual,
        difference,
        percentage,
      });
    }
    return deviations;
  }

  public async analyzeAnnualSpend(
    tenantId: ETenantType,
    userId: string,
    year: number,
  ): Promise<ICategoryDeviation[]> {
    this.logger.info("Analyzing annual spend vs. budget", {
      tenantId,
      userId,
      year,
    });

    // Aggregate budgets and actuals across all 12 months
    const months = Array.from({ length: 12 }, (_, i) => i + 1);
    const [budgetsByMonth, actualsByMonth] = await Promise.all([
      Promise.all(
        months.map((m) =>
          this.budgetStore.getBudgetsByPeriod(tenantId, userId, m, year),
        ),
      ),
      Promise.all(
        months.map((m) =>
          this.transactionStore.aggregateSpendByCategory(
            tenantId,
            userId,
            m,
            year,
          ),
        ),
      ),
    ]);

    const annualBudgets = budgetsByMonth.reduce(
      (acc, map) => {
        for (const [k, v] of Object.entries(map)) {
          acc[k] = (acc[k] || 0) + Number(v || 0);
        }
        return acc;
      },
      {} as Record<string, number>,
    );

    const annualActuals = actualsByMonth.reduce(
      (acc, map) => {
        for (const [k, v] of Object.entries(map)) {
          acc[k] = (acc[k] || 0) + Number(v || 0);
        }
        return acc;
      },
      {} as Record<string, number>,
    );

    // Provide default recommended budgets if NO budgets exist for the whole year.
    if (Object.keys(annualBudgets).length === 0) {
      const income = Number(annualActuals[EBaseCategories.income] || 0);
      if (income > 0) {
        const round2 = (n: number) => Number(n.toFixed(2));
        annualBudgets[EBaseCategories.expenses] = -round2(income * 0.8);
        annualBudgets[EBaseCategories.savings] = -round2(income * 0.2);
      }
    }

    const categories = new Set<EBaseCategories>(
      [...Object.keys(annualBudgets), ...Object.keys(annualActuals)].map(
        (c) => c as EBaseCategories,
      ),
    );

    const deviations: ICategoryDeviation[] = [];
    for (const cat of categories) {
      const recommended = annualBudgets[cat] || 0;
      const actual = annualActuals[cat] || 0;
      const difference = actual - recommended;
      const percentage = recommended ? (difference / recommended) * 100 : 0;
      deviations.push({
        category: cat as EBaseCategories,
        recommended,
        actual,
        difference,
        percentage,
      });
    }

    return deviations;
  }
}
