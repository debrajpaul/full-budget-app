import { ILogger, IBudget, IBudgetStore, ETenantType } from "@common";
import { PutCommand, DynamoDBDocumentClient } from "@aws-sdk/lib-dynamodb";

export class BudgetStore implements IBudgetStore {
  private readonly logger: ILogger;
  private readonly tableName: string;
  private readonly store: DynamoDBDocumentClient;

  constructor(
    logger: ILogger,
    tableName: string,
    store: DynamoDBDocumentClient,
  ) {
    this.logger = logger;
    this.tableName = tableName;
    this.store = store;
  }

  public async setBudget(
    tenantId: ETenantType,
    userId: string,
    year: number,
    month: number,
    category: string,
    amount: number,
  ): Promise<IBudget> {
    const cat = category.trim();
    const keyMonth = String(month).padStart(2, "0");
    const budgetId = `${userId}#${year}-${keyMonth}#${cat.toLowerCase()}`;
    const now = new Date().toISOString();

    const item: IBudget = {
      tenantId,
      budgetId,
      userId,
      year,
      month,
      category: cat,
      amount,
      createdAt: now,
      updatedAt: now,
    };

    this.logger.info("Upserting budget", { tenantId, budgetId, amount });
    const command = new PutCommand({ TableName: this.tableName, Item: item });
    await this.store.send(command);
    return item;
  }
}
