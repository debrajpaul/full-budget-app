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
      req.userId
    );
    expect(store.saveTransactions).toHaveBeenCalledWith(req.tenantId, txns);
  });

  it("ingests an Axis credit card statement and persists canonical transactions", async () => {
    const req: ITransactionSqsRequest = {
      fileKey: "axis.csv",
      fileName: "axis.csv",
      bankName: EBankName.axis,
      bankType: EBankType.creditCard,
      userId: "axis-user",
      tenantId: ETenantType.default,
    };
    const csv = [
      "Axis Bank Credit Card Statement",
      "Generated On: 01/09/2025",
      "Date,Transaction Details,,Amount (INR),Debit/Credit",
      '01 Aug \'25,Groceries,,"₹1,000.00",Debit',
      '02 Aug \'25,Cashback,,"₹250.00",Credit',
      "** End of Statement **",
    ].join("\n");
    s3.getFile.mockResolvedValue(Buffer.from(csv, "utf-8"));

    const result = await service.process(req);

    expect(result).toBe(true);
    expect(store.saveTransactions).toHaveBeenCalledWith(
      req.tenantId,
      expect.any(Array)
    );
    const [, savedTxns] = store.saveTransactions.mock.calls[0];
    expect(savedTxns).toHaveLength(2);
    expect(savedTxns[0]).toMatchObject({
      userId: req.userId,
      bankName: EBankName.axis,
      bankType: EBankType.creditCard,
      txnDate: "2025-08-01",
      description: "Groceries",
      debit: 1000,
      credit: 0,
      balance: 0,
    });
    expect(savedTxns[0].transactionId).toBeDefined();
    expect(savedTxns[1]).toMatchObject({
      txnDate: "2025-08-02",
      credit: 250,
      debit: 0,
    });
    expect(new Set(savedTxns.map((txn: any) => txn.transactionId)).size).toBe(
      savedTxns.length
    );
  });

  it("returns false and does not persist when statement format is invalid", async () => {
    const req: ITransactionSqsRequest = {
      fileKey: "bad-axis.csv",
      fileName: "bad-axis.csv",
      bankName: EBankName.axis,
      bankType: EBankType.creditCard,
      userId: "axis-user",
      tenantId: ETenantType.default,
    };
    s3.getFile.mockResolvedValue(Buffer.from("no transactions here", "utf-8"));

    const result = await service.process(req);

    expect(result).toBe(false);
    expect(store.saveTransactions).not.toHaveBeenCalled();
    expect(logger.error).toHaveBeenCalledWith(
      "Error processing message",
      expect.any(Error)
    );
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
      expect.any(Error)
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
        expectedEnd
      );
      expect(result.totalIncome).toBe(1000);
      expect(result.totalExpense).toBe(500);
      expect(result.netSavings).toBe(500);
      expect(result.transactions).toHaveLength(3);
    });

    it("annualReview returns totals and netSavings for given year", async () => {
      const yearlyTxns = [
        {
          tenantId,
          userId,
          transactionId: "jan-income",
          bankName: EBankName.hdfc,
          bankType: EBankType.savings,
          credit: 2000,
          debit: 0,
          balance: 8000,
          txnDate: new Date(year, 0, 5).toISOString(), // January
          description: "January salary",
          category: "INCOME" as any,
          createdAt: new Date().toISOString(),
        },
        {
          tenantId,
          userId,
          transactionId: "jan-expense",
          bankName: EBankName.hdfc,
          bankType: EBankType.savings,
          credit: 0,
          debit: 500,
          balance: 7500,
          txnDate: new Date(year, 0, 12).toISOString(),
          description: "Rent",
          category: "EXPENSES" as any,
          createdAt: new Date().toISOString(),
        },
        {
          tenantId,
          userId,
          transactionId: "jun-income",
          bankName: EBankName.sbi,
          bankType: EBankType.savings,
          credit: 1500,
          debit: 0,
          balance: 9000,
          txnDate: new Date(year, 5, 18).toISOString(), // June
          description: "Bonus",
          category: "INCOME" as any,
          createdAt: new Date().toISOString(),
        },
        {
          tenantId,
          userId,
          transactionId: "dec-expense",
          bankName: EBankName.axis,
          bankType: EBankType.creditCard,
          credit: 0,
          debit: 300,
          balance: 8700,
          txnDate: new Date(year, 11, 28).toISOString(), // December
          description: "Year-end shopping",
          category: "EXPENSES" as any,
          createdAt: new Date().toISOString(),
        },
      ];
      store.getTransactionsByDateRange.mockResolvedValue(yearlyTxns as any);

      const result = await service.annualReview(tenantId, userId, year);

      const expectedStart = new Date(year, 0, 1).toISOString();
      const expectedEnd = new Date(year + 1, 0, 1).toISOString();

      const monthlyTotals = yearlyTxns.reduce(
        (acc, txn) => {
          const month = new Date(txn.txnDate).getMonth();
          acc[month] = acc[month] || { income: 0, expense: 0 };
          acc[month].income += Number(txn.credit);
          acc[month].expense += Number(txn.debit);
          return acc;
        },
        {} as Record<number, { income: number; expense: number }>
      );
      const expectedIncome = Object.values(monthlyTotals).reduce(
        (sum, month) => sum + month.income,
        0
      );
      const expectedExpense = Object.values(monthlyTotals).reduce(
        (sum, month) => sum + month.expense,
        0
      );

      expect(store.getTransactionsByDateRange).toHaveBeenCalledWith(
        tenantId,
        userId,
        expectedStart,
        expectedEnd
      );
      expect(result.totalIncome).toBe(expectedIncome);
      expect(result.totalExpense).toBe(expectedExpense);
      expect(result.netSavings).toBe(expectedIncome - expectedExpense);
      expect(result.transactions).toEqual(yearlyTxns);
    });

    it("categoryBreakDown aggregates totals with sub-categories and omits categories without transactions", async () => {
      const augustTxns = [
        {
          tenantId,
          userId,
          transactionId: "income-aug",
          bankName: EBankName.hdfc,
          bankType: EBankType.savings,
          credit: 3200,
          debit: 0,
          balance: 5000,
          txnDate: new Date(year, month - 1, 1).toISOString(),
          description: "Salary",
          category: "INCOME" as any,
          subCategory: "SALARY",
          createdAt: new Date().toISOString(),
        },
        {
          tenantId,
          userId,
          transactionId: "groceries-aug",
          bankName: EBankName.hdfc,
          bankType: EBankType.savings,
          credit: 0,
          debit: 450,
          balance: 4700,
          txnDate: new Date(year, month - 1, 3).toISOString(),
          description: "Groceries",
          category: "EXPENSES" as any,
          subCategory: "GROCERIES",
          createdAt: new Date().toISOString(),
        },
        {
          tenantId,
          userId,
          transactionId: "rent-aug",
          bankName: EBankName.hdfc,
          bankType: EBankType.savings,
          credit: 0,
          debit: 1200,
          balance: 3500,
          txnDate: new Date(year, month - 1, 5).toISOString(),
          description: "Rent",
          category: "EXPENSES" as any,
          subCategory: "RENT",
          createdAt: new Date().toISOString(),
        },
        {
          tenantId,
          userId,
          transactionId: "misc-uncategorized",
          bankName: EBankName.sbi,
          bankType: EBankType.savings,
          credit: 0,
          debit: 150,
          balance: 3350,
          txnDate: new Date(year, month - 1, 8).toISOString(),
          description: "Misc",
          category: undefined,
          createdAt: new Date().toISOString(),
        },
      ];
      store.getTransactionsByDateRange.mockResolvedValue(augustTxns as any);

      const result = await service.categoryBreakDown(
        tenantId,
        userId,
        month,
        year
      );

      const expectedStart = new Date(year, month - 1, 1).toISOString();
      const expectedEnd = new Date(year, month, 0).toISOString();

      expect(store.getTransactionsByDateRange).toHaveBeenCalledWith(
        tenantId,
        userId,
        expectedStart,
        expectedEnd
      );

      const categories = result.map((g) => g.category);
      expect(categories).toEqual(
        expect.arrayContaining(["INCOME", "EXPENSES", "Uncategorized"])
      );
      expect(categories).not.toEqual(
        expect.arrayContaining(["TRAVEL", "ENTERTAINMENT"])
      );

      const expensesGroup = result.find((g) => g.category === "EXPENSES");
      expect(expensesGroup?.transactions.map((t) => t.subCategory)).toEqual(
        expect.arrayContaining(["GROCERIES", "RENT"])
      );

      const totalFromGroups = result.reduce(
        (sum, group) => sum + group.totalAmount,
        0
      );
      const totalFromTxns = augustTxns.reduce(
        (sum, txn) => sum + Number(txn.credit) - Number(txn.debit),
        0
      );
      expect(totalFromGroups).toBe(totalFromTxns);
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
        expectedEnd
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
        expectedEnd
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
        month
      );
      expect(res).toHaveLength(3);
    });

    it("filteredTransactions filters by bankName when provided", async () => {
      store.getTransactionsByDateRange.mockResolvedValue(sampleTxns as any);

      const res = await service.filteredTransactions(
        tenantId,
        userId,
        year,
        month,
        EBankName.hdfc
      );

      const expectedStart = new Date(year, month - 1, 1).toISOString();
      const expectedEnd = new Date(year, month, 0).toISOString();

      expect(store.getTransactionsByDateRange).toHaveBeenCalledWith(
        tenantId,
        userId,
        expectedStart,
        expectedEnd
      );
      expect(res).toHaveLength(2);
      expect(res.every((txn) => txn.bankName === EBankName.hdfc)).toBe(true);
    });

    it("filteredTransactions filters by bankName and category together", async () => {
      store.getTransactionsByDateRange.mockResolvedValue(sampleTxns as any);

      const res = await service.filteredTransactions(
        tenantId,
        userId,
        year,
        month,
        EBankName.hdfc,
        "EXPENSES"
      );

      expect(res).toHaveLength(1);
      expect(res[0]).toMatchObject({
        transactionId: "t2",
        bankName: EBankName.hdfc,
        category: "EXPENSES",
      });
    });

    it("filteredTransactions returns empty array when filters do not match", async () => {
      store.getTransactionsByDateRange.mockResolvedValue(sampleTxns as any);

      const res = await service.filteredTransactions(
        tenantId,
        userId,
        year,
        month,
        EBankName.axis,
        "SAVINGS"
      );

      expect(res).toHaveLength(0);
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
        taggedBy
      );

      expect(store.updateTransactionCategory).toHaveBeenCalledWith(
        tenantId,
        txnId,
        category,
        subCategory,
        taggedBy
      );
      expect(result).toEqual({ id: txnId, category, taggedBy });
    });
  });
});
