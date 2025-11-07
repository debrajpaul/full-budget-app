import { TransactionService } from "./transaction-service";
import { mock } from "jest-mock-extended";
import {
  ILogger,
  IS3Service,
  ISQSService,
  ITransactionStore,
  ITransactionSqsRequest,
  ETenantType,
  EBankName,
  EBankType,
} from "@common";

describe("TransactionService", () => {
  let logger: ReturnType<typeof mock<ILogger>>;
  let s3: ReturnType<typeof mock<IS3Service>>;
  let sqs: ReturnType<typeof mock<ISQSService>>;
  let store: ReturnType<typeof mock<ITransactionStore>>;
  let service: TransactionService;

  beforeEach(() => {
    logger = mock<ILogger>();
    s3 = mock<IS3Service>();
    sqs = mock<ISQSService>();
    store = mock<ITransactionStore>();
    service = new TransactionService(logger, s3, sqs, store);
  });

  it("should return false if no SQS message", async () => {
    sqs.receiveFileMessage.mockResolvedValue(undefined);
    const result = await service.processes();
    expect(result).toBe(false);
    expect(logger.warn).toHaveBeenCalledWith("No messages received from SQS");
  });

  it("should process a valid SQS message", async () => {
    const msg: ITransactionSqsRequest = {
      fileKey: "file.pdf",
      fileName: "file.pdf",
      bankName: EBankName.hdfc,
      bankType: EBankType.savings,
      userId: "user1",
      tenantId: ETenantType.default,
    };
    sqs.receiveFileMessage.mockResolvedValue(msg);
    jest.spyOn(service, "process").mockResolvedValue(true);
    const result = await service.processes();
    expect(result).toBe(true);
    expect(service.process).toHaveBeenCalledWith(msg);
  });

  it("should return false if SQS message is invalid", async () => {
    sqs.receiveFileMessage.mockResolvedValue({} as any);
    const result = await service.processes();
    expect(result).toBe(false);
    expect(logger.error).toHaveBeenCalledWith("Invalid message body:");
  });

  it("should process a file and save transactions", async () => {
    const req: ITransactionSqsRequest = {
      fileKey: "file.pdf",
      fileName: "file.pdf",
      bankName: EBankName.hdfc,
      bankType: EBankType.savings,
      userId: "user1",
      tenantId: ETenantType.default,
    };
    const buffer = Buffer.from("test");
    const txns = [
      {
        userId: "user1",
        transactionId: "t1",
        bankName: EBankName.hdfc,
        bankType: EBankType.savings,
        credit: 100,
        debit: 0,
        txnDate: "2025-08-15",
        description: "desc",
        balance: 1000,
        category: "cat" as any,
        type: "credit",
        updatedAt: new Date().toISOString(),
      },
    ];
    s3.getFile.mockResolvedValue(buffer);
    const parseSpy = jest
      .spyOn(service as any, "parseTransactions")
      .mockResolvedValue(txns);
    store.saveTransactions.mockResolvedValue();
    const result = await service.process(req);
    expect(result).toBe(true);
    expect(s3.getFile).toHaveBeenCalledWith("file.pdf");
    expect(parseSpy).toHaveBeenCalledWith(
      buffer,
      req.bankName,
      req.bankType,
      req.userId,
    );
    expect(store.saveTransactions).toHaveBeenCalledWith(req.tenantId, txns);
  });

  it("should return false if process throws", async () => {
    s3.getFile.mockRejectedValue(new Error("fail"));
    const req: ITransactionSqsRequest = {
      fileKey: "file.pdf",
      fileName: "file.pdf",
      bankName: EBankName.hdfc,
      bankType: EBankType.savings,
      userId: "user1",
      tenantId: ETenantType.default,
    };
    const result = await service.process(req);
    expect(result).toBe(false);
    expect(logger.error).toHaveBeenCalledWith(
      "Error processing message",
      expect.any(Error),
    );
  });

  describe("analytics methods", () => {
    const tenantId = ETenantType.default;
    const userId = "user-1";
    const year = 2025;
    const month = 8; // August

    const sampleTxns = [
      {
        tenantId,
        userId,
        transactionId: "t1",
        bankName: EBankName.hdfc,
        bankType: EBankType.savings,
        credit: 1000,
        debit: 0,
        balance: 5000,
        txnDate: new Date(year, month - 1, 5).toISOString(),
        description: "Salary",
        category: undefined,
        createdAt: new Date().toISOString(),
      },
      {
        tenantId,
        userId,
        transactionId: "t2",
        bankName: EBankName.hdfc,
        bankType: EBankType.savings,
        credit: 0,
        debit: 300,
        balance: 4700,
        txnDate: new Date(year, month - 1, 10).toISOString(),
        description: "Groceries",
        category: "EXPENSES" as any,
        createdAt: new Date().toISOString(),
      },
      {
        tenantId,
        userId,
        transactionId: "t3",
        bankName: EBankName.sbi,
        bankType: EBankType.savings,
        credit: 0,
        debit: 200,
        balance: 4500,
        txnDate: new Date(year, month - 1, 15).toISOString(),
        description: "Utilities",
        category: "EXPENSES" as any,
        createdAt: new Date().toISOString(),
      },
    ];

    beforeEach(() => {
      store.getTransactionsByDateRange.mockReset();
    });

    it("monthlyReview returns totals and netSavings for given month", async () => {
      store.getTransactionsByDateRange.mockResolvedValue(sampleTxns as any);

      const result = await service.monthlyReview(tenantId, userId, month, year);

      const expectedStart = new Date(year, month - 1, 1).toISOString();
      const expectedEnd = new Date(year, month, 1).toISOString();

      expect(store.getTransactionsByDateRange).toHaveBeenCalledWith(
        tenantId,
        userId,
        expectedStart,
        expectedEnd,
      );
      expect(result.totalIncome).toBe(1000);
      expect(result.totalExpense).toBe(500);
      expect(result.netSavings).toBe(500);
      expect(result.transactions).toHaveLength(3);
    });

    it("annualReview returns totals and netSavings for given year", async () => {
      store.getTransactionsByDateRange.mockResolvedValue(sampleTxns as any);

      const result = await service.annualReview(tenantId, userId, year);

      const expectedStart = new Date(year, 0, 1).toISOString();
      const expectedEnd = new Date(year + 1, 0, 1).toISOString();

      expect(store.getTransactionsByDateRange).toHaveBeenCalledWith(
        tenantId,
        userId,
        expectedStart,
        expectedEnd,
      );
      expect(result.totalIncome).toBe(1000);
      expect(result.totalExpense).toBe(500);
      expect(result.netSavings).toBe(500);
      expect(result.transactions).toHaveLength(3);
    });

    it("categoryBreakDown groups totals by category within month", async () => {
      store.getTransactionsByDateRange.mockResolvedValue(sampleTxns as any);

      const result = await service.categoryBreakDown(
        tenantId,
        userId,
        month,
        year,
      );

      const expectedStart = new Date(year, month - 1, 1).toISOString();
      const expectedEnd = new Date(year, month, 0).toISOString();

      expect(store.getTransactionsByDateRange).toHaveBeenCalledWith(
        tenantId,
        userId,
        expectedStart,
        expectedEnd,
      );

      const byCategory = Object.fromEntries(
        result.map((g) => [g.category, g.totalAmount]),
      );
      expect(byCategory["Uncategorized"]).toBe(1000);
      expect(byCategory["EXPENSES"]).toBe(-500);
    });

    it("aggregateSummary calculates totals for monthly range when month provided", async () => {
      store.getTransactionsByDateRange.mockResolvedValue(sampleTxns as any);

      const res = await service.aggregateSummary(tenantId, userId, year, month);

      const expectedStart = new Date(year, month - 1, 1).toISOString();
      const expectedEnd = new Date(year, month, 0).toISOString();
      expect(store.getTransactionsByDateRange).toHaveBeenCalledWith(
        tenantId,
        userId,
        expectedStart,
        expectedEnd,
      );
      expect(res.totalIncome).toBe(1000);
      expect(res.totalExpense).toBe(500);
      expect(res.netSavings).toBe(500);
    });

    it("aggregateSummary calculates totals for annual range when month omitted", async () => {
      store.getTransactionsByDateRange.mockResolvedValue(sampleTxns as any);

      const res = await service.aggregateSummary(tenantId, userId, year);

      const expectedStart = new Date(year, 0, 1).toISOString();
      const expectedEnd = new Date(year, 11, 31).toISOString();
      expect(store.getTransactionsByDateRange).toHaveBeenCalledWith(
        tenantId,
        userId,
        expectedStart,
        expectedEnd,
      );
      expect(res.totalIncome).toBe(1000);
      expect(res.totalExpense).toBe(500);
      expect(res.netSavings).toBe(500);
    });

    it("filteredTransactions returns all txns when no filters provided", async () => {
      store.getTransactionsByDateRange.mockResolvedValue(sampleTxns as any);
      const res = await service.filteredTransactions(
        tenantId,
        userId,
        year,
        month,
      );
      expect(res).toHaveLength(3);
    });
  });

  describe("reclassifyTransaction", () => {
    it("updates category (and optional subcategory) on a transaction", async () => {
      const tenantId = ETenantType.default;
      const txnId = "txn-123";
      const category = "EXPENSES";
      const subCategory = "FOOD";
      const taggedBy = "user@test.com";

      store.updateTransactionCategory.mockResolvedValue();

      const result = await service.reclassifyTransaction(
        tenantId,
        txnId,
        category,
        subCategory,
        taggedBy,
      );

      expect(store.updateTransactionCategory).toHaveBeenCalledWith(
        tenantId,
        txnId,
        category,
        subCategory,
        taggedBy,
      );
      expect(result).toEqual({ id: txnId, category, taggedBy });
    });
  });
});
