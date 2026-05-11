import { ILogger, IRefreshToken, IRefreshTokenStore } from "@common";
import {
  PutCommand,
  GetCommand,
  QueryCommand,
  UpdateCommand,
  DynamoDBDocumentClient,
} from "@aws-sdk/lib-dynamodb";

export class RefreshTokenStore implements IRefreshTokenStore {
  private readonly logger: ILogger;
  private readonly tableName: string;
  private readonly store: DynamoDBDocumentClient;

  constructor(
    logger: ILogger,
    tableName: string,
    store: DynamoDBDocumentClient
  ) {
    this.logger = logger;
    this.tableName = tableName;
    this.store = store;
  }

  public async save(token: IRefreshToken): Promise<void> {
    this.logger.debug("Saving refresh token", {
      family: token.family,
      userId: token.userId,
    });
    await this.store.send(
      new PutCommand({ TableName: this.tableName, Item: token })
    );
  }

  public async findById(tokenId: string): Promise<IRefreshToken | null> {
    this.logger.debug("Looking up refresh token");
    const result = await this.store.send(
      new GetCommand({
        TableName: this.tableName,
        Key: { tokenId },
      })
    );
    return result.Item ? (result.Item as IRefreshToken) : null;
  }

  public async revokeToken(tokenId: string): Promise<void> {
    this.logger.debug("Revoking refresh token");
    await this.store.send(
      new UpdateCommand({
        TableName: this.tableName,
        Key: { tokenId },
        UpdateExpression: "SET isRevoked = :t",
        ExpressionAttributeValues: { ":t": true },
        ConditionExpression: "attribute_exists(tokenId)",
      })
    );
  }

  public async revokeFamily(family: string): Promise<void> {
    this.logger.debug("Revoking entire token family — reuse attack detected", {
      family,
    });
    const result = await this.store.send(
      new QueryCommand({
        TableName: this.tableName,
        IndexName: "FamilyIndex",
        KeyConditionExpression: "family = :family",
        ExpressionAttributeValues: { ":family": family },
      })
    );
    const items = (result.Items as IRefreshToken[]) || [];
    await Promise.all(
      items.map((item) =>
        this.store.send(
          new UpdateCommand({
            TableName: this.tableName,
            Key: { tokenId: item.tokenId },
            UpdateExpression: "SET isRevoked = :t",
            ExpressionAttributeValues: { ":t": true },
          })
        )
      )
    );
  }
}
