import { chunk } from "lodash";
import {
  ITransaction,
  ILogger,
  ITransactionStore,
  ETenantType,
  EBaseCategories,
} from "@common";
import {
  PutCommand,
  QueryCommand,
  UpdateCommand,
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
    tenantId: ETenantType,
    txns: Omit<ITransaction, "createdAt" | "tenantId">[],
  ): Promise<void> {
    this.logger.info("Saving transactions to DynamoDB");
    this.logger.debug("Transactions", { txns });

    const batches = chunk(txns, 25);
    for (const batch of batches) {
      const promises = batch.map((txn) => this.saveTransaction(tenantId, txn));
      await Promise.all(promises);
    }

    this.logger.info(`Finished processing ${txns.length} transactions.`);
  }

  async saveTransaction(
    tenantId: ETenantType,
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
        embedding: txn.embedding,
        taggedBy: txn.taggedBy,
        confidence: txn.confidence,
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
    tenantId: ETenantType,
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
    tenantId: ETenantType,
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

  public async aggregateSpendByCategory(
    tenantId: ETenantType,
    userId: string,
    month: number,
    year: number,
  ): Promise<Record<string, number>> {
    const startDate = new Date(year, month - 1, 1).toISOString();
    const endDate = new Date(year, month, 0).toISOString();
    const items = await this.getTransactionsByDateRange(
      tenantId,
      userId,
      startDate,
      endDate,
    );
    return items.reduce((acc, txn) => {
      const cat = txn.category || EBaseCategories.default;
      const amount = Number(txn.amount) || 0;
      acc[cat] = (acc[cat] || 0) + amount;
      return acc;
    }, {} as Record<string, number>);
  }

  public async updateTransactionCategory(
    tenantId: ETenantType,
    transactionId: string,
    matchedCategory: EBaseCategories,
    taggedBy?: string,
    confidence?: number,
    embedding?: number[],
  ): Promise<void> {
    this.logger.info(`Updating transaction category`);
    this.logger.debug("Transaction ID & Category", {
      transactionId,
      matchedCategory,
    });

    const updateExpressions = ["category = :cat"];
    const expressionAttributeValues: Record<string, any> = {
      ":cat": matchedCategory,
    };

    if (taggedBy !== undefined) {
      updateExpressions.push("taggedBy = :tagger");
      expressionAttributeValues[":tagger"] = taggedBy;
    }

    if (confidence !== undefined) {
      updateExpressions.push("confidence = :conf");
      expressionAttributeValues[":conf"] = confidence;
    }

    if (embedding !== undefined) {
      updateExpressions.push("embedding = :emb");
      expressionAttributeValues[":emb"] = embedding;
    }

    updateExpressions.push("updatedAt = :updatedAt");
    expressionAttributeValues[":updatedAt"] = new Date().toISOString();

    const command = new UpdateCommand({
      TableName: this.tableName,
      Key: {
        tenantId,
        transactionId,
      },
      UpdateExpression: `SET ${updateExpressions.join(", ")}`,
      ExpressionAttributeValues: expressionAttributeValues,
    });
    await this.store.send(command);
    this.logger.info(`Updated category for transaction: ${transactionId}`);
  }
}
