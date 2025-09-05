/* eslint-disable  @typescript-eslint/no-unused-vars */
import { TransactionStore } from "./transaction-store";
import { mock } from "jest-mock-extended";
import { DynamoDBDocumentClient } from "@aws-sdk/lib-dynamodb";
import {
  ILogger,
  ITransaction,
  ETenantType,
  EBankName,
  EBaseCategories,
} from "@common";

describe("TransactionStore", () => {
  let storeMock: { send: jest.Mock };
  let loggerMock: ReturnType<typeof mock<ILogger>>;
  let transactionStore: TransactionStore;
  const tableName = "transactions";
  const tenantId = ETenantType.default;
  const txn: ITransaction = {
    tenantId,
    userId: "user1",
    transactionId: "txn1",
    bankName: EBankName.hdfc,
    txnDate: "2025-08-07",
    amount: 100,
    description: "desc",
    balance: 1000,
    category: EBaseCategories.default,
    embedding: [0.1, 0.2],
    taggedBy: "AI_TAGGER",
    confidence: 0.9,
    type: "credit",
    createdAt: "2025-08-07T00:00:00.000Z",
  };

  beforeEach(() => {
    loggerMock = mock<ILogger>();
    storeMock = { send: jest.fn() };
    transactionStore = new TransactionStore(
      loggerMock,
      tableName,
      storeMock as unknown as DynamoDBDocumentClient,
    );
  });

  it("should save a transaction", async () => {
    storeMock.send = jest.fn().mockResolvedValue({});
    const { tenantId, ...txnWithoutTenant } = txn;
    await transactionStore.saveTransaction(tenantId, txnWithoutTenant);
    expect(storeMock.send).toHaveBeenCalled();
    const callArg = storeMock.send.mock.calls[0][0];
    expect(callArg.input.Item.embedding).toEqual(txn.embedding);
    expect(callArg.input.Item.taggedBy).toEqual(txn.taggedBy);
    expect(callArg.input.Item.confidence).toEqual(txn.confidence);
    expect(loggerMock.info).toHaveBeenCalledWith(
      `Saving transaction: ${txn.transactionId}`,
    );
  });

  it("should warn on duplicate transaction", async () => {
    storeMock.send = jest.fn().mockRejectedValue({
      name: "ConditionalCheckFailedException",
    });
    const { tenantId, ...txnWithoutTenant } = txn;
    await transactionStore.saveTransaction(tenantId, txnWithoutTenant);
    expect(loggerMock.warn).toHaveBeenCalledWith(
      `Duplicate transaction: ${txn.transactionId}`,
    );
  });

  it("should throw error on unknown error", async () => {
    storeMock.send = jest.fn().mockRejectedValue({
      name: "OtherError",
      message: "fail",
      stack: "stack",
    });
    const { tenantId, ...txnWithoutTenant } = txn;
    await expect(
      transactionStore.saveTransaction(tenantId, txnWithoutTenant),
    ).rejects.toThrow("Failed to save transaction: fail");
    expect(loggerMock.error).toHaveBeenCalledWith(
      `Error saving transaction: ${txn.transactionId}`,
      expect.objectContaining({ message: "fail" }),
    );
  });

  it("should save multiple transactions in chunks", async () => {
    const txns = Array.from({ length: 30 }, (_, i) => {
      const { tenantId, ...txnWithoutTenant } = {
        ...txn,
        transactionId: `txn${i}`,
      };
      return txnWithoutTenant;
    });
    jest
      .spyOn(transactionStore, "saveTransaction")
      .mockResolvedValue(undefined);
    await transactionStore.saveTransactions(tenantId, txns);
    expect(transactionStore.saveTransaction).toHaveBeenCalledTimes(30);
  });

  it("should get user transactions", async () => {
    storeMock.send = jest.fn().mockResolvedValue({ Items: [txn] });
    const result = await transactionStore.getUserTransactions(
      tenantId,
      txn.userId,
    );
    expect(storeMock.send).toHaveBeenCalled();
    expect(result).toEqual([txn]);
  });

  it("should get transactions by date range", async () => {
    storeMock.send = jest.fn().mockResolvedValue({ Items: [txn] });
    const result = await transactionStore.getTransactionsByDateRange(
      tenantId,
      txn.userId,
      "2025-08-01",
      "2025-08-31",
    );
    expect(storeMock.send).toHaveBeenCalled();
    expect(result).toEqual([txn]);
  });

  it("should update transaction category with metadata", async () => {
    storeMock.send = jest.fn().mockResolvedValue({});
    await transactionStore.updateTransactionCategory(
      tenantId,
      txn.transactionId,
      EBaseCategories.expenses,
      "AI_TAGGER",
      0.95,
      [0.1, 0.2],
    );
    expect(storeMock.send).toHaveBeenCalled();
    const command = storeMock.send.mock.calls[0][0];
    expect(command.input.ExpressionAttributeValues).toMatchObject({
      ":cat": EBaseCategories.expenses,
      ":tagger": "AI_TAGGER",
      ":conf": 0.95,
      ":emb": [0.1, 0.2],
    });
    expect(command.input.ExpressionAttributeValues[":updatedAt"]).toBeDefined();
  });

  it("should update only category when no metadata provided", async () => {
    storeMock.send = jest.fn().mockResolvedValue({});
    await transactionStore.updateTransactionCategory(
      tenantId,
      txn.transactionId,
      EBaseCategories.income,
    );
    const command = storeMock.send.mock.calls[0][0];
    expect(command.input.ExpressionAttributeValues).toMatchObject({
      ":cat": EBaseCategories.income,
    });
    expect(command.input.UpdateExpression).toBe(
      "SET category = :cat, updatedAt = :updatedAt",
    );
  });
});
