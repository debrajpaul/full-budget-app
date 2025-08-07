import { TransactionStore } from "./transaction";

describe("TransactionStore", () => {
  let storeMock: any;
  let loggerMock: any;
  let transactionStore: TransactionStore;
  const tableName = "transactions";
  const txn = {
    userId: "user1",
    transactionId: "txn1",
    bankName: "Bank",
    txnDate: "2025-08-07",
    amount: 100,
    description: "desc",
    balance: 1000,
    category: "cat",
    type: "credit",
  };

  beforeEach(() => {
    loggerMock = {
      info: jest.fn(),
      debug: jest.fn(),
      warn: jest.fn(),
      error: jest.fn(),
    };
    storeMock = {
      send: jest.fn(),
    };
    transactionStore = new TransactionStore(loggerMock, tableName, storeMock);
  });

  it("should save a transaction", async () => {
    storeMock.send.mockResolvedValue({});
    await transactionStore.saveTransaction(txn);
    expect(storeMock.send).toHaveBeenCalled();
    expect(loggerMock.info).toHaveBeenCalledWith(
      `Saving transaction: ${txn.transactionId}`,
    );
  });

  it("should warn on duplicate transaction", async () => {
    storeMock.send.mockRejectedValue({
      name: "ConditionalCheckFailedException",
    });
    await transactionStore.saveTransaction(txn);
    expect(loggerMock.warn).toHaveBeenCalledWith(
      `Duplicate transaction: ${txn.transactionId}`,
    );
  });

  it("should throw error on unknown error", async () => {
    storeMock.send.mockRejectedValue({
      name: "OtherError",
      message: "fail",
      stack: "stack",
    });
    await expect(transactionStore.saveTransaction(txn)).rejects.toThrow(
      "Failed to save transaction: fail",
    );
    expect(loggerMock.error).toHaveBeenCalledWith(
      `Error saving transaction: ${txn.transactionId}`,
      expect.objectContaining({ message: "fail" }),
    );
  });

  it("should save multiple transactions in chunks", async () => {
    const txns = Array.from({ length: 30 }, (_, i) => ({
      ...txn,
      transactionId: `txn${i}`,
    }));
    jest
      .spyOn(transactionStore, "saveTransaction")
      .mockResolvedValue(undefined);
    await transactionStore.saveTransactions(txns);
    expect(transactionStore.saveTransaction).toHaveBeenCalledTimes(30);
  });

  it("should get user transactions", async () => {
    storeMock.send.mockResolvedValue({ Items: [txn] });
    const result = await transactionStore.getUserTransactions(txn.userId);
    expect(storeMock.send).toHaveBeenCalled();
    expect(result).toEqual([txn]);
  });

  it("should get transactions by date range", async () => {
    storeMock.send.mockResolvedValue({ Items: [txn] });
    const result = await transactionStore.getTransactionsByDateRange(
      txn.userId,
      "2025-08-01",
      "2025-08-31",
    );
    expect(storeMock.send).toHaveBeenCalled();
    expect(result).toEqual([txn]);
  });
});
