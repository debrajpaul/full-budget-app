import { IUser, IUserUpdate, ILogger, IUserStore } from "@common";
import {
  PutCommand,
  GetCommand,
  UpdateCommand,
  DynamoDBDocumentClient,
} from "@aws-sdk/lib-dynamodb";
export class UserStore implements IUserStore {
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
    this.tableName = tableName;
    this.store = store;
  }

  public async getUser(
    tenantId: string,
    email: string,
  ): Promise<IUser | undefined> {
    this.logger.info("Getting user from DynamoDB");
    this.logger.debug("User", { email, tenantId });
    const result = await this.store.send(
      new GetCommand({
        TableName: this.tableName,
        Key: { email, tenantId },
      }),
    );
    return result.Item as IUser | undefined;
  }

  public async saveUser(user: IUser): Promise<void> {
    this.logger.info("Saving user to DynamoDB");
    this.logger.debug("User", { user });
    const item: IUser = {
      tenantId: user.tenantId,
      email: user.email,
      name: user.name,
      passwordHash: user.passwordHash,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
      isActive: user.isActive,
    };

    await this.store.send(
      new PutCommand({
        TableName: this.tableName,
        Item: item,
        ConditionExpression:
          "attribute_not_exists(email) AND attribute_not_exists(tenantId)",
      }),
    );
  }

  public async updateUser(tenantId: string, input: IUserUpdate): Promise<void> {
    this.logger.info("Updating user in DynamoDB");
    this.logger.debug("User", { input, tenantId });
    const { email, ...rest } = input;

    const updateExpressions: string[] = [];
    const expressionAttributeValues: Record<string, any> = {};
    const expressionAttributeNames: Record<string, string> = {};

    for (const key in rest) {
      const value = rest[key as keyof typeof rest];
      if (value !== undefined) {
        const attr = `#${key}`;
        const val = `:${key}`;
        updateExpressions.push(`${attr} = ${val}`);
        expressionAttributeNames[attr] = key;
        expressionAttributeValues[val] =
          value instanceof Date ? value.toISOString() : value;
      }
    }

    if (updateExpressions.length === 0) return;

    updateExpressions.push(`#updatedAt = :updatedAt`);
    expressionAttributeNames["#updatedAt"] = "updatedAt";
    expressionAttributeValues[":updatedAt"] = new Date().toISOString();

    await this.store.send(
      new UpdateCommand({
        TableName: this.tableName,
        Key: { email, tenantId },
        UpdateExpression: "SET " + updateExpressions.join(", "),
        ExpressionAttributeNames: expressionAttributeNames,
        ExpressionAttributeValues: expressionAttributeValues,
      }),
    );
  }
}
