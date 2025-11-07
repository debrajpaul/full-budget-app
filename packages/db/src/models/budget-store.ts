import {
  ILogger,
  IBudget,
  IBudgetStore,
  ETenantType,
  EBaseCategories,
} from "@common";
import {
  PutCommand,
  QueryCommand,
  DynamoDBDocumentClient,
} from "@aws-sdk/lib-dynamodb";

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
    category: EBaseCategories,
    amount: number,
    subCategory?: string,
  ): Promise<IBudget> {
    const keyMonth = String(month).padStart(2, "0");
    const budgetId = `${userId}#${year}-${keyMonth}#${category}`;
    const now = new Date().toISOString();

    const item: IBudget = {
      tenantId,
      budgetId,
      userId,
      year,
      month,
      category,
      subCategory,
      amount,
      createdAt: now,
      updatedAt: now,
    };

    this.logger.debug("Upserting budget", { tenantId, budgetId, amount });
    const command = new PutCommand({ TableName: this.tableName, Item: item });
    await this.store.send(command);
    return item;
  }

  public async getBudgetsByPeriod(
    tenantId: ETenantType,
    userId: string,
    month: number,
    year: number,
  ): Promise<Record<string, number>> {
    const keyMonth = String(month).padStart(2, "0");
    const prefix = `${userId}#${year}-${keyMonth}#`;
    this.logger.debug("Fetching budgets by period", {
      tenantId,
      userId,
      month,
      year,
    });

    const command = new QueryCommand({
      TableName: this.tableName,
      KeyConditionExpression:
        "tenantId = :tenantId AND begins_with(budgetId, :prefix)",
      ExpressionAttributeValues: {
        ":tenantId": tenantId,
        ":prefix": prefix,
      },
    });

    const result = await this.store.send(command);
    const items = (result.Items as IBudget[]) || [];
    const map: Record<string, number> = {};
    for (const b of items) {
      map[b.category] = (map[b.category] || 0) + Number(b.amount || 0);
    }
    return map;
  }
}
