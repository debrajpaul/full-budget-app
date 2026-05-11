import { randomUUID } from "crypto";
import {
  ILogger,
  ISavingsGoal,
  ISavingsGoalStore,
  ICreateSavingsGoalInput,
  IUpdateSavingsGoalInput,
  ETenantType,
} from "@common";
import {
  PutCommand,
  GetCommand,
  QueryCommand,
  DeleteCommand,
  UpdateCommand,
  DynamoDBDocumentClient,
} from "@aws-sdk/lib-dynamodb";

// DynamoDB key schema:
//   PK  tenantId (string)   — partition key
//   SK  goalId   (string)   — sort key  format: <userId>#<uuid>

export class SavingsGoalStore implements ISavingsGoalStore {
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

  public async listSavingsGoals(
    tenantId: ETenantType,
    userId: string
  ): Promise<ISavingsGoal[]> {
    this.logger.debug("Listing savings goals", { tenantId, userId });
    const command = new QueryCommand({
      TableName: this.tableName,
      KeyConditionExpression:
        "tenantId = :tenantId AND begins_with(goalId, :prefix)",
      ExpressionAttributeValues: {
        ":tenantId": tenantId,
        ":prefix": `${userId}#`,
      },
    });
    const result = await this.store.send(command);
    return ((result.Items as ISavingsGoal[]) || []).map((item) =>
      this._toGoal(item)
    );
  }

  public async getSavingsGoalById(
    tenantId: ETenantType,
    userId: string,
    id: string
  ): Promise<ISavingsGoal | null> {
    this.logger.debug("Getting savings goal by id", { tenantId, userId, id });
    const goalId = this._goalId(userId, id);
    const command = new GetCommand({
      TableName: this.tableName,
      Key: { tenantId, goalId },
    });
    const result = await this.store.send(command);
    if (!result.Item) return null;
    return this._toGoal(result.Item as ISavingsGoal & { goalId: string });
  }

  public async createSavingsGoal(
    tenantId: ETenantType,
    userId: string,
    input: ICreateSavingsGoalInput
  ): Promise<ISavingsGoal> {
    const uuid = randomUUID();
    const goalId = `${userId}#${uuid}`;
    const initialAmount = input.initialAmount ?? 100;
    const today = new Date().toISOString().split("T")[0];

    const item = {
      tenantId,
      goalId,
      id: uuid,
      name: input.name,
      target: input.target,
      current: initialAmount,
      deadline: input.deadline,
      history: [{ date: today, value: initialAmount }],
    };

    this.logger.debug("Creating savings goal", { tenantId, goalId });
    const command = new PutCommand({ TableName: this.tableName, Item: item });
    await this.store.send(command);
    return this._toGoal(item);
  }

  public async updateSavingsGoal(
    tenantId: ETenantType,
    userId: string,
    id: string,
    input: IUpdateSavingsGoalInput
  ): Promise<ISavingsGoal> {
    const goalId = this._goalId(userId, id);
    this.logger.debug("Updating savings goal", { tenantId, goalId });

    const setExprParts: string[] = [];
    const exprAttrNames: Record<string, string> = {};
    const exprAttrValues: Record<string, unknown> = {};

    if (input.name !== undefined) {
      setExprParts.push("#name = :name");
      exprAttrNames["#name"] = "name";
      exprAttrValues[":name"] = input.name;
    }
    if (input.target !== undefined) {
      setExprParts.push("target = :target");
      exprAttrValues[":target"] = input.target;
    }
    if (input.deadline !== undefined) {
      setExprParts.push("deadline = :deadline");
      exprAttrValues[":deadline"] = input.deadline;
    }

    if (setExprParts.length === 0) {
      const existing = await this.getSavingsGoalById(tenantId, userId, id);
      if (!existing) throw new Error("Savings goal not found");
      return existing;
    }

    const command = new UpdateCommand({
      TableName: this.tableName,
      Key: { tenantId, goalId },
      UpdateExpression: `SET ${setExprParts.join(", ")}`,
      ExpressionAttributeNames:
        Object.keys(exprAttrNames).length > 0 ? exprAttrNames : undefined,
      ExpressionAttributeValues: exprAttrValues,
      ConditionExpression: "attribute_exists(goalId)",
      ReturnValues: "ALL_NEW",
    });

    const result = await this.store.send(command);
    return this._toGoal(result.Attributes as ISavingsGoal & { goalId: string });
  }

  public async deleteSavingsGoal(
    tenantId: ETenantType,
    userId: string,
    id: string
  ): Promise<void> {
    const goalId = this._goalId(userId, id);
    if (!goalId.startsWith(`${userId}#`)) {
      throw new Error("Savings goal does not belong to this user");
    }
    this.logger.debug("Deleting savings goal", { tenantId, goalId });
    const command = new DeleteCommand({
      TableName: this.tableName,
      Key: { tenantId, goalId },
    });
    await this.store.send(command);
  }

  public async addContribution(
    tenantId: ETenantType,
    userId: string,
    id: string,
    amount: number,
    date: string
  ): Promise<ISavingsGoal> {
    const goalId = this._goalId(userId, id);
    this.logger.debug("Adding contribution to savings goal", {
      tenantId,
      goalId,
      amount,
    });

    const command = new UpdateCommand({
      TableName: this.tableName,
      Key: { tenantId, goalId },
      UpdateExpression:
        "SET #current = #current + :amount, history = list_append(history, :point)",
      ExpressionAttributeNames: { "#current": "current" },
      ExpressionAttributeValues: {
        ":amount": amount,
        ":point": [{ date, value: amount }],
      },
      ConditionExpression: "attribute_exists(goalId)",
      ReturnValues: "ALL_NEW",
    });

    const result = await this.store.send(command);
    return this._toGoal(result.Attributes as ISavingsGoal & { goalId: string });
  }

  private _goalId(userId: string, id: string): string {
    return `${userId}#${id}`;
  }

  private _toGoal(item: ISavingsGoal & { goalId?: string }): ISavingsGoal {
    return {
      id: item.id,
      name: item.name,
      target: item.target,
      current: item.current,
      deadline: item.deadline,
      history: item.history,
    };
  }
}
