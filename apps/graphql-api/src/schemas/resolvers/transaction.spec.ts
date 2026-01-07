import { transactionResolvers } from "./transaction";
import { ETenantType, IGraphQLContext, ILogger } from "@common";
import { mock, mockDeep } from "jest-mock-extended";

const monthlyReview = transactionResolvers.Query.monthlyReview;
const annualReview = transactionResolvers.Query.annualReview;
const categoryBreakdown = transactionResolvers.Query.categoryBreakdown;
const aggregateSummary = transactionResolvers.Query.aggregateSummary;
const reclassifyTransaction =
  transactionResolvers.Mutation.reclassifyTransaction;

const buildContext = () => {
  const dataSources = mockDeep<IGraphQLContext["dataSources"]>();

  const ctx: IGraphQLContext = {
    logger: mock<ILogger>(),
    request: {} as any,
    response: undefined,
    lambdaContext: undefined,
    userId: "user-123",
    tenantId: ETenantType.default,
    email: "user@example.com",
    dataSources,
  };

  return { ctx, dataSources };
};

describe("transactionResolvers.monthlyReview", () => {
  const year = 2025;
  const month = 8;

  const txnDate = (day: number) =>
    new Date(Date.UTC(year, month - 1, day)).toISOString();

  it("returns totals, aggregated series, and category breakdown for a populated month", async () => {
    const { ctx, dataSources } = buildContext();
    const txns = [
      { credit: 1000, debit: 0, txnDate: txnDate(1) },
      { credit: 0, debit: 300, txnDate: txnDate(3) },
      { credit: 500, debit: 0, txnDate: txnDate(20) },
    ];

    dataSources.transactionService.monthlyReview.mockResolvedValue({
      totalIncome: 1500,
      totalExpense: 300,
      netSavings: 1200,
      transactions: txns as any,
    });
    dataSources.transactionService.categoryBreakDown.mockResolvedValue([
      { category: "INCOME", totalAmount: 1500, transactions: [] },
      { category: "EXPENSES", totalAmount: -300, transactions: [] },
    ]);

    const result = await monthlyReview({}, { month, year }, ctx);

    expect(dataSources.transactionService.monthlyReview).toHaveBeenCalledWith(
      ETenantType.default,
      "user-123",
      month,
      year
    );
    expect(
      dataSources.transactionService.categoryBreakDown
    ).toHaveBeenCalledWith(ETenantType.default, "user-123", month, year);
    expect(result.totalIncome).toBe(1500);
    expect(result.totalExpenses).toBe(300);
    expect(result.savings).toBe(1200);
    expect(result.categoryBreakdown).toEqual([
      { name: "INCOME", amount: 1500 },
      { name: "EXPENSES", amount: -300 },
    ]);
    expect(result.series).toEqual([
      { date: txnDate(1).split("T")[0], budget: 0, actual: 1000 },
      { date: txnDate(3).split("T")[0], budget: 0, actual: -300 },
      { date: txnDate(20).split("T")[0], budget: 0, actual: 500 },
    ]);
  });

  it("returns zeros and empty lists when there are no transactions", async () => {
    const { ctx, dataSources } = buildContext();

    dataSources.transactionService.monthlyReview.mockResolvedValue({
      totalIncome: 0,
      totalExpense: 0,
      netSavings: 0,
      transactions: [],
    });
    dataSources.transactionService.categoryBreakDown.mockResolvedValue([]);

    const result = await monthlyReview({}, { month, year }, ctx);

    expect(result.totalIncome).toBe(0);
    expect(result.totalExpenses).toBe(0);
    expect(result.savings).toBe(0);
    expect(result.categoryBreakdown).toEqual([]);
    expect(result.series).toEqual([]);
  });
});

describe("transactionResolvers.annualReview", () => {
  const year = 2025;

  const txnDate = (month: number, day: number) =>
    new Date(Date.UTC(year, month - 1, day)).toISOString();

  it("aggregates income and expenses across all months and returns yearly transactions", async () => {
    const { ctx, dataSources } = buildContext();
    const txns = [
      { credit: 1200, debit: 0, txnDate: txnDate(1, 5) },
      { credit: 0, debit: 400, txnDate: txnDate(1, 20) },
      { credit: 800, debit: 0, txnDate: txnDate(6, 10) },
      { credit: 0, debit: 250, txnDate: txnDate(12, 31) },
    ];
    const monthlyTotals = txns.reduce(
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

    dataSources.transactionService.annualReview.mockResolvedValue({
      totalIncome: expectedIncome,
      totalExpense: expectedExpense,
      netSavings: expectedIncome - expectedExpense,
      transactions: txns as any,
    });

    const result = await annualReview({}, { year }, ctx);

    expect(dataSources.transactionService.annualReview).toHaveBeenCalledWith(
      ETenantType.default,
      "user-123",
      year
    );
    expect(result.totalIncome).toBe(expectedIncome);
    expect(result.totalExpense).toBe(expectedExpense);
    expect(result.netSavings).toBe(expectedIncome - expectedExpense);
    expect(result.transactions).toEqual(txns);
  });
});

describe("transactionResolvers.categoryBreakdown", () => {
  const year = 2026;
  const month = 7;

  const txnDate = (day: number) =>
    new Date(Date.UTC(year, month - 1, day)).toISOString();

  it("returns category totals with transactions and sub-categories while omitting empty categories", async () => {
    const { ctx, dataSources } = buildContext();
    const incomeTxn = {
      transactionId: "txn-income",
      category: "INCOME",
      subCategory: "SALARY",
      credit: 3200,
      debit: 0,
      txnDate: txnDate(1),
    };
    const groceryTxn = {
      transactionId: "txn-groceries",
      category: "EXPENSES",
      subCategory: "GROCERIES",
      credit: 0,
      debit: 450,
      txnDate: txnDate(3),
    };
    const rentTxn = {
      transactionId: "txn-rent",
      category: "EXPENSES",
      subCategory: "RENT",
      credit: 0,
      debit: 1200,
      txnDate: txnDate(5),
    };
    const grouped = [
      {
        category: "INCOME",
        totalAmount: incomeTxn.credit - incomeTxn.debit,
        transactions: [incomeTxn],
      },
      {
        category: "EXPENSES",
        totalAmount:
          -(Number(groceryTxn.debit) + Number(rentTxn.debit)) +
          Number(groceryTxn.credit) +
          Number(rentTxn.credit),
        transactions: [groceryTxn, rentTxn],
      },
    ];
    dataSources.transactionService.categoryBreakDown.mockResolvedValue(
      grouped as any
    );

    const result = await categoryBreakdown({}, { month, year }, ctx);

    expect(
      dataSources.transactionService.categoryBreakDown
    ).toHaveBeenCalledWith(ETenantType.default, "user-123", month, year);
    const monthTotalFromTxns = grouped
      .flatMap((c) => c.transactions)
      .reduce((sum, txn) => sum + Number(txn.credit) - Number(txn.debit), 0);
    const totalFromGroups = result.reduce(
      (sum, group) => sum + group.totalAmount,
      0
    );
    expect(totalFromGroups).toBe(monthTotalFromTxns);
    expect(result).toHaveLength(2);
    const expensesGroup = result.find((c) => c.category === "EXPENSES");
    expect(expensesGroup?.transactions.map((t) => t.subCategory)).toEqual(
      expect.arrayContaining(["GROCERIES", "RENT"])
    );
    expect(result).toEqual(
      expect.not.arrayContaining([
        expect.objectContaining({ category: "UNUSED_CATEGORY" }),
      ])
    );
  });
});

describe("transactionResolvers.aggregateSummary", () => {
  const year = 2027;
  const month = 9;

  it("returns annual totals when month is omitted", async () => {
    const { ctx, dataSources } = buildContext();
    const annualTotals = {
      totalIncome: 18000,
      totalExpense: 7200,
      netSavings: 10800,
    };
    dataSources.transactionService.aggregateSummary.mockResolvedValue(
      annualTotals as any
    );

    const result = await aggregateSummary({}, { year }, ctx);

    expect(
      dataSources.transactionService.aggregateSummary
    ).toHaveBeenCalledWith(ETenantType.default, "user-123", year, undefined);
    expect(result).toEqual(annualTotals);
  });

  it("returns monthly totals and forwards the month to restrict the window", async () => {
    const { ctx, dataSources } = buildContext();
    const monthlyTotals = {
      totalIncome: 2500,
      totalExpense: 900,
      netSavings: 1600,
    };
    dataSources.transactionService.aggregateSummary.mockResolvedValue(
      monthlyTotals as any
    );

    const result = await aggregateSummary({}, { year, month }, ctx);

    expect(
      dataSources.transactionService.aggregateSummary
    ).toHaveBeenCalledWith(ETenantType.default, "user-123", year, month);
    expect(result).toEqual(monthlyTotals);
  });
});

describe("transactionResolvers.reclassifyTransaction", () => {
  const year = 2025;
  const month = 9;
  const txnDate = (day: number) =>
    new Date(Date.UTC(year, month - 1, day)).toISOString();

  it("updates the category/taggedBy and subsequent monthly metrics reflect the change", async () => {
    const { ctx, dataSources } = buildContext();
    const transactionId = "txn-reclassify";
    const initialCategory = "EXPENSES";
    const newCategory = "SAVINGS";
    const taggedBy = ctx.email as string;

    const baseTransactions = [
      { credit: 0, debit: 200, category: initialCategory, txnDate: txnDate(2) },
      { credit: 1000, debit: 0, category: "INCOME", txnDate: txnDate(5) },
    ];

    dataSources.transactionService.monthlyReview
      .mockResolvedValueOnce({
        totalIncome: 1000,
        totalExpense: 200,
        netSavings: 800,
        transactions: baseTransactions as any,
      })
      .mockResolvedValueOnce({
        totalIncome: 1000,
        totalExpense: 200,
        netSavings: 800,
        transactions: [
          { ...baseTransactions[0], category: newCategory },
          baseTransactions[1],
        ] as any,
      });
    dataSources.transactionService.categoryBreakDown
      .mockResolvedValueOnce([
        { category: "INCOME", totalAmount: 1000, transactions: [] },
        { category: initialCategory, totalAmount: -200, transactions: [] },
      ])
      .mockResolvedValueOnce([
        { category: "INCOME", totalAmount: 1000, transactions: [] },
        { category: newCategory, totalAmount: -200, transactions: [] },
      ]);
    dataSources.transactionService.reclassifyTransaction.mockResolvedValue({
      id: transactionId,
      category: newCategory,
      taggedBy,
    });

    const before = await monthlyReview({}, { month, year }, ctx);
    expect(before.categoryBreakdown).toEqual([
      { name: "INCOME", amount: 1000 },
      { name: initialCategory, amount: -200 },
    ]);
    expect(before.savings).toBe(800);

    const mutationResult = await reclassifyTransaction(
      {},
      { id: transactionId, category: newCategory },
      ctx
    );

    expect(
      dataSources.transactionService.reclassifyTransaction
    ).toHaveBeenCalledWith(
      ETenantType.default,
      transactionId,
      newCategory,
      taggedBy
    );
    expect(mutationResult).toEqual({
      id: transactionId,
      category: newCategory,
      taggedBy,
    });

    const after = await monthlyReview({}, { month, year }, ctx);
    expect(after.categoryBreakdown).toEqual([
      { name: "INCOME", amount: 1000 },
      { name: newCategory, amount: -200 },
    ]);
    expect(after.savings).toBe(800);
  });
});
