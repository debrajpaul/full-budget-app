/* eslint-disable  @typescript-eslint/no-unused-vars */
import { TransactionStore } from "./transaction-store";
import { mock } from "jest-mock-extended";
import { DynamoDBDocumentClient } from "@aws-sdk/lib-dynamodb";
import {
  ILogger,
  ITransaction,
  ETenantType,
  EBankName,
  EBankType,
  EBaseCategories,
  ESubExpenseCategories,
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
    bankType: EBankType.savings,
    txnDate: "2025-08-07",
    credit: 100,
    debit: 0,
    description: "desc",
    balance: 1000,
    category: EBaseCategories.unclassified,
    taggedBy: "RULE_ENGINE",
    confidence: 0.9,
    createdAt: "2025-08-07T00:00:00.000Z",
  };

  beforeEach(() => {
    loggerMock = mock<ILogger>();
    storeMock = { send: jest.fn() };
    transactionStore = new TransactionStore(
      loggerMock,
      tableName,
      storeMock as unknown as DynamoDBDocumentClient
    );
  });

  it("should save a transaction", async () => {
    storeMock.send = jest.fn().mockResolvedValue({});
    const { tenantId, ...txnWithoutTenant } = txn;
    await transactionStore.saveTransaction(tenantId, txnWithoutTenant);
    expect(storeMock.send).toHaveBeenCalled();
    const callArg = storeMock.send.mock.calls[0][0];
    expect(callArg.input.Item.taggedBy).toEqual(txn.taggedBy);
    expect(callArg.input.Item.confidence).toEqual(txn.confidence);
    expect(loggerMock.debug).toHaveBeenCalledWith(
      `Saving transaction: ${txn.transactionId}`
    );
  });

  it("should warn on duplicate transaction", async () => {
    storeMock.send = jest.fn().mockRejectedValue({
      name: "ConditionalCheckFailedException",
    });
    const { tenantId, ...txnWithoutTenant } = txn;
    await transactionStore.saveTransaction(tenantId, txnWithoutTenant);
    expect(loggerMock.warn).toHaveBeenCalledWith(
      `Duplicate transaction: ${txn.transactionId}`
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
      transactionStore.saveTransaction(tenantId, txnWithoutTenant)
    ).rejects.toThrow("Failed to save transaction: fail");
    expect(loggerMock.error).toHaveBeenCalledWith(
      `Error saving transaction: ${txn.transactionId}`,
      expect.objectContaining({ message: "fail" })
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
      txn.userId
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
      "2025-08-31"
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
      undefined,
      "RULE_ENGINE",
      0.95,
      undefined
    );
    expect(storeMock.send).toHaveBeenCalled();
    const command = storeMock.send.mock.calls[0][0];
    expect(command.input.ExpressionAttributeValues).toMatchObject({
      ":cat": EBaseCategories.expenses,
      ":tagger": "RULE_ENGINE",
      ":conf": 0.95,
    });
    expect(command.input.ExpressionAttributeValues[":updatedAt"]).toBeDefined();
  });

  it("should update transaction category with subCategory", async () => {
    storeMock.send = jest.fn().mockResolvedValue({});
    await transactionStore.updateTransactionCategory(
      tenantId,
      txn.transactionId,
      EBaseCategories.expenses,
      ESubExpenseCategories.food,
      "RULE_ENGINE",
      0.88,
      undefined
    );
    const command = storeMock.send.mock.calls[0][0];
    expect(command.input.UpdateExpression).toContain("subCategory = :subCat");
    expect(command.input.ExpressionAttributeValues).toMatchObject({
      ":cat": EBaseCategories.expenses,
      ":subCat": ESubExpenseCategories.food,
      ":tagger": "RULE_ENGINE",
      ":conf": 0.88,
    });
  });

  it("should update only category when no metadata provided", async () => {
    storeMock.send = jest.fn().mockResolvedValue({});
    await transactionStore.updateTransactionCategory(
      tenantId,
      txn.transactionId,
      EBaseCategories.income
    );
    const command = storeMock.send.mock.calls[0][0];
    expect(command.input.ExpressionAttributeValues).toMatchObject({
      ":cat": EBaseCategories.income,
    });
    expect(command.input.UpdateExpression).toBe(
      "SET category = :cat, updatedAt = :updatedAt"
    );
  });

  it("should aggregate spend by category for given month and year", async () => {
    const userId = txn.userId;
    const items: ITransaction[] = [
      {
        ...txn,
        transactionId: "txnA",
        credit: 0,
        debit: 50,
        category: EBaseCategories.expenses,
      },
      {
        ...txn,
        transactionId: "txnB",
        credit: 0,
        debit: 100,
        category: EBaseCategories.expenses,
      },
      {
        ...txn,
        transactionId: "txnC",
        credit: 200,
        debit: 0,
        category: EBaseCategories.income,
      },
    ];

    jest
      .spyOn(transactionStore, "getTransactionsByDateRange")
      .mockResolvedValue(items);

    const result = await transactionStore.aggregateSpendByCategory(
      tenantId,
      userId,
      8,
      2025
    );

    expect(transactionStore.getTransactionsByDateRange).toHaveBeenCalledTimes(
      1
    );
    expect(result).toEqual({
      [EBaseCategories.expenses]: -150,
      [EBaseCategories.income]: 200,
    });
  });
});
