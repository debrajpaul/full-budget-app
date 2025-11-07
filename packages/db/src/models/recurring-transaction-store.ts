import {
  ILogger,
  IRecurringTransaction,
  IRecurringTransactionStore,
  ETenantType,
} from "@common";
import {
  PutCommand,
  QueryCommand,
  DynamoDBDocumentClient,
} from "@aws-sdk/lib-dynamodb";

export class RecurringTransactionStore implements IRecurringTransactionStore {
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

  public async create(
    tenantId: ETenantType,
    recurring: Omit<IRecurringTransaction, "tenantId" | "createdAt">,
  ): Promise<IRecurringTransaction> {
    const item: IRecurringTransaction = {
      ...recurring,
      tenantId,
      createdAt: new Date().toISOString(),
    };
    this.logger.debug(`Creating recurring transaction: ${item.recurringId}`);
    const command = new PutCommand({
      TableName: this.tableName,
      Item: item,
      ConditionExpression:
        "attribute_not_exists(tenantId) AND attribute_not_exists(recurringId)",
    });
    await this.store.send(command);
    return item;
  }

  public async listByUser(
    tenantId: ETenantType,
    userId: string,
  ): Promise<IRecurringTransaction[]> {
    this.logger.debug(`Listing recurring transactions for user`);
    const command = new QueryCommand({
      TableName: this.tableName,
      KeyConditionExpression:
        "tenantId = :tenantId AND begins_with(recurringId, :prefix)",
      ExpressionAttributeValues: {
        ":tenantId": tenantId,
        ":prefix": `${userId}#`,
      },
    });
    const result = await this.store.send(command);
    return (result.Items as IRecurringTransaction[]) || [];
  }
}
