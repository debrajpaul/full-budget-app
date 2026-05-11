import { randomUUID } from "crypto";
import {
  ILogger,
  ISinkingFund,
  ISinkingFundStore,
  ICreateSinkingFundInput,
  IUpdateSinkingFundInput,
  ETenantType,
} from "@common";
import {
  PutCommand,
  GetCommand,
  QueryCommand,
  UpdateCommand,
  DeleteCommand,
  DynamoDBDocumentClient,
} from "@aws-sdk/lib-dynamodb";

export class SinkingFundStore implements ISinkingFundStore {
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

  public async listSinkingFunds(
    tenantId: ETenantType,
    userId: string
  ): Promise<ISinkingFund[]> {
    this.logger.debug("Listing sinking funds", { tenantId, userId });

    const command = new QueryCommand({
      TableName: this.tableName,
      KeyConditionExpression:
        "tenantId = :tenantId AND begins_with(fundId, :prefix)",
      ExpressionAttributeValues: {
        ":tenantId": tenantId,
        ":prefix": `${userId}#`,
      },
    });

    const result = await this.store.send(command);
    return ((result.Items as ISinkingFund[]) || []).map(this.mapItem);
  }

  public async getSinkingFund(
    tenantId: ETenantType,
    userId: string,
    id: string
  ): Promise<ISinkingFund | null> {
    this.logger.debug("Getting sinking fund", { tenantId, userId, id });
    const fundId = `${userId}#${id}`;

    const command = new GetCommand({
      TableName: this.tableName,
      Key: { tenantId, fundId },
    });

    const result = await this.store.send(command);
    if (!result.Item) return null;
    return this.mapItem(result.Item as any);
  }

  public async createSinkingFund(
    tenantId: ETenantType,
    userId: string,
    input: ICreateSinkingFundInput
  ): Promise<ISinkingFund> {
    const id = randomUUID();
    const fundId = `${userId}#${id}`;
    const today = new Date().toISOString().split("T")[0];
    const now = new Date().toISOString();

    const item = {
      tenantId,
      fundId,
      id,
      userId,
      name: input.name,
      target: input.target,
      current: 0,
      monthlyContribution: input.monthlyContribution,
      deadline: input.deadline,
      history: [{ date: today, value: 0 }],
      createdAt: now,
      updatedAt: now,
    };

    this.logger.debug("Creating sinking fund", { tenantId, fundId });
    const command = new PutCommand({ TableName: this.tableName, Item: item });
    await this.store.send(command);
    return this.mapItem(item);
  }

  public async updateSinkingFund(
    tenantId: ETenantType,
    userId: string,
    id: string,
    input: IUpdateSinkingFundInput
  ): Promise<ISinkingFund> {
    const fundId = `${userId}#${id}`;
    this.logger.debug("Updating sinking fund metadata", {
      tenantId,
      fundId,
      input,
    });

    const updateExpressions: string[] = ["updatedAt = :updatedAt"];
    const expressionAttributeValues: Record<string, any> = {
      ":updatedAt": new Date().toISOString(),
    };
    const expressionAttributeNames: Record<string, string> = {};

    if (input.name !== undefined) {
      updateExpressions.push("#name = :name");
      expressionAttributeNames["#name"] = "name";
      expressionAttributeValues[":name"] = input.name;
    }
    if (input.target !== undefined) {
      updateExpressions.push("target = :target");
      expressionAttributeValues[":target"] = input.target;
    }
    if (input.monthlyContribution !== undefined) {
      updateExpressions.push("monthlyContribution = :mc");
      expressionAttributeValues[":mc"] = input.monthlyContribution;
    }
    if (input.deadline !== undefined) {
      updateExpressions.push("deadline = :deadline");
      expressionAttributeValues[":deadline"] = input.deadline;
    }

    const command = new UpdateCommand({
      TableName: this.tableName,
      Key: { tenantId, fundId },
      UpdateExpression: `SET ${updateExpressions.join(", ")}`,
      ExpressionAttributeValues: expressionAttributeValues,
      ...(Object.keys(expressionAttributeNames).length > 0 && {
        ExpressionAttributeNames: expressionAttributeNames,
      }),
      ConditionExpression: "attribute_exists(tenantId)",
      ReturnValues: "ALL_NEW",
    });

    const result = await this.store.send(command);
    return this.mapItem(result.Attributes as any);
  }

  public async contributeSinkingFund(
    tenantId: ETenantType,
    userId: string,
    id: string,
    amount: number,
    date: string
  ): Promise<ISinkingFund> {
    const fundId = `${userId}#${id}`;
    this.logger.debug("Contributing to sinking fund", {
      tenantId,
      fundId,
      amount,
      date,
    });

    const command = new UpdateCommand({
      TableName: this.tableName,
      Key: { tenantId, fundId },
      UpdateExpression:
        "SET current = current + :amount, history = list_append(history, :point), updatedAt = :updatedAt",
      ExpressionAttributeValues: {
        ":amount": amount,
        ":point": [{ date, value: amount }],
        ":updatedAt": new Date().toISOString(),
      },
      ConditionExpression: "attribute_exists(tenantId)",
      ReturnValues: "ALL_NEW",
    });

    const result = await this.store.send(command);
    return this.mapItem(result.Attributes as any);
  }

  public async deleteSinkingFund(
    tenantId: ETenantType,
    userId: string,
    id: string
  ): Promise<void> {
    const fundId = `${userId}#${id}`;
    this.logger.debug("Deleting sinking fund", { tenantId, fundId });

    const command = new DeleteCommand({
      TableName: this.tableName,
      Key: { tenantId, fundId },
    });
    await this.store.send(command);
  }

  private mapItem(item: any): ISinkingFund {
    return {
      id: item.id,
      name: item.name,
      target: Number(item.target),
      current: Number(item.current),
      monthlyContribution:
        item.monthlyContribution !== undefined
          ? Number(item.monthlyContribution)
          : undefined,
      deadline: item.deadline,
      history: (item.history || []).map((h: any) => ({
        date: h.date,
        value: Number(h.value),
      })),
    };
  }
}
