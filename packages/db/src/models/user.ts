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
    this.store = store;
  }

  public async getUser(email: string): Promise<IUser | undefined> {
    this.logger.info("Getting user from DynamoDB");
    this.logger.debug("User", { email });
    const result = await this.store.send(
      new GetCommand({
        TableName: this.tableName,
        Key: { email },
      }),
    );
    return result.Item as IUser | undefined;
  }

  public async saveUser(user: IUser): Promise<void> {
    this.logger.info("Saving user to DynamoDB");
    this.logger.debug("User", { user });
    const item = {
      email: user.email, // Partition Key
      name: user.name,
      passwordHash: user.passwordHash,
      createdAt: user.createdAt.toISOString(),
      updatedAt: user.updatedAt.toISOString(),
      isActive: user.isActive,
      ...(user.deletedAt && { deletedAt: user.deletedAt.toISOString() }),
      ...(user.lastLogin && { lastLogin: user.lastLogin.toISOString() }),
    };

    await this.store.send(
      new PutCommand({
        TableName: this.tableName,
        Item: item,
        ConditionExpression: "attribute_not_exists(email)",
      }),
    );
  }

  public async updateUser(input: IUserUpdate): Promise<void> {
    this.logger.info("Updating user in DynamoDB");
    this.logger.debug("User", { input });
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
        Key: { email },
        UpdateExpression: "SET " + updateExpressions.join(", "),
        ExpressionAttributeNames: expressionAttributeNames,
        ExpressionAttributeValues: expressionAttributeValues,
      }),
    );
  }
}
