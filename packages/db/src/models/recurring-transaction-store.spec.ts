import { RecurringTransactionStore } from "./recurring-transaction-store";
import { mock } from "jest-mock-extended";
import {
  DynamoDBDocumentClient,
  PutCommand,
  QueryCommand,
} from "@aws-sdk/lib-dynamodb";
import {
  ILogger,
  IRecurringTransaction,
  ERecurringFrequency,
  ETenantType,
} from "@common";

describe("RecurringTransactionStore", () => {
  let storeMock: { send: jest.Mock };
  let loggerMock: ReturnType<typeof mock<ILogger>>;
  let recurringStore: RecurringTransactionStore;
  const tableName = "recurring-transactions";
  const tenantId = ETenantType.default;

  const baseRecurring: Omit<IRecurringTransaction, "createdAt" | "tenantId"> = {
    userId: "user1",
    recurringId: "user1#rec#1",
    description: "Rent",
    amount: -15000,
    category: "housing",
    frequency: ERecurringFrequency.monthly,
    dayOfMonth: 5,
    startDate: "2025-08-01",
    endDate: undefined,
    nextRunDate: "2025-08-05",
    updatedAt: undefined,
    deletedAt: undefined,
  };

  beforeEach(() => {
    loggerMock = mock<ILogger>();
    storeMock = { send: jest.fn() };
    recurringStore = new RecurringTransactionStore(
      loggerMock,
      tableName,
      storeMock as unknown as DynamoDBDocumentClient,
    );
  });

  it("creates a recurring transaction with conditional put", async () => {
    storeMock.send.mockResolvedValue({});
    const created = await recurringStore.create(tenantId, baseRecurring);
    expect(storeMock.send).toHaveBeenCalledWith(expect.any(PutCommand));
    const call = storeMock.send.mock.calls[0][0] as PutCommand;
    expect(call.input.TableName).toBe(tableName);
    expect(call.input.Item).toMatchObject({
      tenantId,
      recurringId: baseRecurring.recurringId,
      userId: baseRecurring.userId,
      description: baseRecurring.description,
      amount: baseRecurring.amount,
      frequency: baseRecurring.frequency,
      dayOfMonth: baseRecurring.dayOfMonth,
      startDate: baseRecurring.startDate,
    });
    expect(call.input.ConditionExpression).toContain(
      "attribute_not_exists(tenantId)",
    );
    expect(call.input.ConditionExpression).toContain(
      "attribute_not_exists(recurringId)",
    );
    expect(created.recurringId).toBe(baseRecurring.recurringId);
    expect(created.createdAt).toBeDefined();
    expect(loggerMock.debug).toHaveBeenCalledWith(
      `Creating recurring transaction: ${baseRecurring.recurringId}`,
    );
  });

  it("lists recurring transactions by user with prefix query", async () => {
    const item: IRecurringTransaction = {
      tenantId,
      ...baseRecurring,
      createdAt: "2025-08-01T00:00:00.000Z",
    };
    storeMock.send.mockResolvedValue({ Items: [item] });
    const result = await recurringStore.listByUser(
      tenantId,
      baseRecurring.userId,
    );
    expect(storeMock.send).toHaveBeenCalledWith(expect.any(QueryCommand));
    const call = storeMock.send.mock.calls[0][0] as QueryCommand;
    expect(call.input.TableName).toBe(tableName);
    expect(call.input.ExpressionAttributeValues).toMatchObject({
      ":tenantId": tenantId,
      ":prefix": `${baseRecurring.userId}#`,
    });
    expect(result).toEqual([item]);
    expect(loggerMock.debug).toHaveBeenCalledWith(
      "Listing recurring transactions for user",
    );
  });

  it("returns empty list when no items", async () => {
    storeMock.send.mockResolvedValue({ Items: undefined });
    const result = await recurringStore.listByUser(
      tenantId,
      baseRecurring.userId,
    );
    expect(result).toEqual([]);
    expect(loggerMock.debug).toHaveBeenCalledWith(
      "Listing recurring transactions for user",
    );
  });
});
