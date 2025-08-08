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

  public async saveTransactions(
    tenantId: string,
    txns: Omit<ITransaction, "createdAt" | "tenantId">[],
  ): Promise<void> {
    this.logger.info("Saving transactions to DynamoDB");
    this.logger.debug("Transactions", { txns });

    const chunks = chunk(txns, 25);
    for (const chunk of chunks) {
      const promises = chunk.map((txn) => this.saveTransaction(tenantId, txn));
      await Promise.all(promises);
    }

    console.log(`Finished processing ${txns.length} transactions.`);
  }

  async saveTransaction(
    tenantId: string,
    txn: Omit<ITransaction, "createdAt" | "tenantId">,
  ): Promise<void> {
    try {
      this.logger.info(`Saving transaction: ${txn.transactionId}`);
      this.logger.debug("Transaction", { txn });

      const item: ITransaction = {
        tenantId: tenantId,
        userId: txn.userId,
        transactionId: txn.transactionId,
        bankName: txn.bankName,
        txnDate: txn.txnDate,
        amount: txn.amount,
        createdAt: new Date().toISOString(),
        description: txn.description || "NONE",
        balance: txn.balance,
        category: txn.category,
        type: txn.type,
      };

      const command = new PutCommand({
        TableName: this.tableName,
        Item: item,
        ConditionExpression:
          "attribute_not_exists(tenantId) AND attribute_not_exists(transactionId)",
      });

      await this.store.send(command);
      this.logger.info(`Saved transaction: ${txn.transactionId}`);
    } catch (error: any) {
      if (error.name === "ConditionalCheckFailedException") {
        this.logger.warn(`Duplicate transaction: ${txn.transactionId}`);
        return;
      }

      this.logger.error(`Error saving transaction: ${txn.transactionId}`, {
        message: error.message,
        name: error.name,
        stack: error.stack,
      });
      throw new Error(`Failed to save transaction: ${error.message}`);
    }
  }

  public async getUserTransactions(
    tenantId: string,
    userId: string,
  ): Promise<ITransaction[]> {
    this.logger.info(`Getting transactions for user`);
    this.logger.debug("User ID", { userId });

    const command = new QueryCommand({
      TableName: this.tableName,
      KeyConditionExpression:
        "tenantId = :tenantId AND begins_with(transactionId, :prefix)",
      ExpressionAttributeValues: {
        ":tenantId": tenantId,
        ":prefix": `${userId}#`,
      },
    });

    const result = await this.store.send(command);
    return (result.Items as ITransaction[]) || [];
  }

  public async getTransactionsByDateRange(
    tenantId: string,
    userId: string,
    startDate: string,
    endDate: string,
  ): Promise<ITransaction[]> {
    this.logger.info(`Getting transactions by date range`);
    this.logger.debug("User ID, start date & end date", {
      userId,
      startDate,
      endDate,
    });

    const command = new QueryCommand({
      TableName: this.tableName,
      KeyConditionExpression:
        "tenantId = :tenantId AND begins_with(transactionId, :prefix)",
      FilterExpression:
        "#txnDate BETWEEN :start AND :end AND attribute_not_exists(deletedAt)",
      ExpressionAttributeNames: {
        "#txnDate": "txnDate",
      },
      ExpressionAttributeValues: {
        ":tenantId": tenantId,
        ":prefix": `${userId}#`,
        ":start": startDate,
        ":end": endDate,
      },
    });

    const result = await this.store.send(command);
    return (result.Items as ITransaction[]) || [];
  }
}
