import {
  IBudgetService,
  ISetBudgetInput,
  IBudget,
  ILogger,
  ETenantType,
} from "@common";
import { BudgetStore } from "@db";

export class BudgetService implements IBudgetService {
  private readonly logger: ILogger;
  private readonly budgetStore: BudgetStore;

  constructor(logger: ILogger, budgetStore: BudgetStore) {
    this.logger = logger;
    this.budgetStore = budgetStore;
  }

  public async setBudget(
    tenantId: ETenantType,
    userId: string,
    input: ISetBudgetInput,
  ): Promise<IBudget> {
    const { month, year, category, amount } = input;
    this.logger.info("Setting budget", {
      tenantId,
      userId,
      month,
      year,
      category,
      amount,
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
}
