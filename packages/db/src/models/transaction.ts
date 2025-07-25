import { chunk } from "lodash";
import { ITransaction, ILogger, ITransactionStore } from "@common";
import {
  PutCommand,
  QueryCommand,
  DynamoDBDocumentClient,
} from "@aws-sdk/lib-dynamodb";

export class TransactionStore implements ITransactionStore {
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

  public async saveTransactions(txns: ITransaction[]): Promise<void> {
    this.logger.info("Saving transactions to DynamoDB");
    this.logger.debug("Transactions", { txns });

    const chunks = chunk(txns, 25);
    for (const chunk of chunks) {
      const promises = chunk.map((txn) => this.saveTransaction(txn));
      await Promise.all(promises);
    }

    console.log(`Finished processing ${txns.length} transactions.`);
  }

  async saveTransaction(txn: ITransaction): Promise<void> {
    try {
      this.logger.info(`Saving transaction: ${txn.transactionId}`);
      this.logger.debug("Transaction", { txn });
      const PK = `USER#${txn.userId}`,
        SK = `TXN#${txn.transactionId}`,
        item = {
          PK,
          SK,
          userId: { S: txn.userId },
          transactionId: { S: txn.transactionId },
          bankName: { S: txn.bankName },
          amount: { N: txn.amount.toString() },
          txnDate: { S: new Date(txn.txnDate).toISOString() },
          createdAt: { S: txn.createdAt },
          updatedAt: { S: txn.updatedAt },
          ...(txn.description && { description: { S: txn.description } }),
          ...(txn.balance !== undefined && {
            balance: { N: txn.balance.toString() },
          }),
          ...(txn.category && { category: { S: txn.category } }),
          ...(txn.type && { type: { S: txn.type } }),
          ...(txn.deletedAt && {
            deletedAt: { S: new Date(txn.deletedAt).toISOString() },
          }),
        };
      const command = new PutCommand({
        TableName: this.tableName,
        Item: item,
        ConditionExpression:
          "attribute_not_exists(PK) AND attribute_not_exists(SK)",
      });

      await this.store.send(command);
      this.logger.info(`Saved transaction: ${txn.transactionId}`);
    } catch (error: any) {
      if (error.name === "ConditionalCheckFailedException") {
        this.logger.warn(`Duplicate transaction: ${txn.transactionId}`);
        return;
      }

      this.logger.error(
        `Error saving transaction: ${txn.transactionId}`,
        error,
      );
      throw new Error(`Failed to save transaction: ${error.message}`);
    }
  }

  public async getUserTransactions(userId: string): Promise<ITransaction[]> {
    this.logger.info(`Getting transactions for user`);
    this.logger.debug("User ID", { userId });
    const command = new QueryCommand({
      TableName: this.tableName,
      KeyConditionExpression: "PK = :pk AND begins_with(SK, :skPrefix)",
      ExpressionAttributeValues: {
        ":pk": `USER#${userId}`,
        ":skPrefix": "TXN#",
      },
    });

    const result = await this.store.send(command);
    return result.Items as ITransaction[];
  }
}
