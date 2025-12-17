import {
  MonthlyReviewArgs,
  AnnualReviewArgs,
  CategoryBreakdownArgs,
  AggregateSummaryArgs,
  TransactionsQueryArgs,
  ReclassifyTransactionArgs,
} from "../../utils";
import { IGraphQLContext, EBankName } from "@common";
import { CustomError } from "@services";

export const transactionResolvers = {
  Query: {
    monthlyReview: async (
      _: unknown,
      args: { month: number; year: number },
      ctx: IGraphQLContext
    ) => {
      if (!ctx.userId) throw new CustomError("Unauthorized", "UNAUTHORIZED");
      if (!ctx.tenantId)
        throw new CustomError("Tenant ID is required", "TENANT_ID_REQUIRED");
      const { month, year } = MonthlyReviewArgs.parse(args);
      const review = await ctx.dataSources.transactionService.monthlyReview(
        ctx.tenantId,
        ctx.userId,
        month,
        year
      );
      if (!review)
        throw new CustomError(
          "No transactions found for the selected period",
          "NOT_FOUND"
        );
      const categories =
        await ctx.dataSources.transactionService.categoryBreakDown(
          ctx.tenantId,
          ctx.userId,
          month,
          year
        );
      const categoryBreakdown = categories.map((c) => ({
        name: c.category,
        amount: c.totalAmount,
      }));
      const dailyMap: Record<string, number> = {};
      review.transactions.forEach((txn) => {
        const date = new Date(txn.txnDate || "").toISOString().split("T")[0];
        dailyMap[date] =
          (dailyMap[date] || 0) + Number(txn.credit) - Number(txn.debit);
      });
      const series = Object.entries(dailyMap)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([date, actual]) => ({ date, budget: 0, actual }));
      return {
        totalIncome: review.totalIncome,
        totalExpenses: review.totalExpense,
        savings: review.netSavings,
        categoryBreakdown,
        series,
      };
    },

    annualReview: async (
      _: unknown,
      args: { year: number },
      ctx: IGraphQLContext
    ) => {
      if (!ctx.userId) throw new CustomError("Unauthorized", "UNAUTHORIZED");
      if (!ctx.tenantId)
        throw new CustomError("Tenant ID is required", "TENANT_ID_REQUIRED");
      const { year } = AnnualReviewArgs.parse(args);
      const result = await ctx.dataSources.transactionService.annualReview(
        ctx.tenantId,
        ctx.userId,
        year
      );
      if (!result)
        throw new CustomError(
          "No transactions found for the selected year",
          "NOT_FOUND"
        );
      return result;
    },

    categoryBreakdown: async (
      _: unknown,
      args: { month: number; year: number },
      ctx: IGraphQLContext
    ) => {
      if (!ctx.userId) throw new CustomError("Unauthorized", "UNAUTHORIZED");
      if (!ctx.tenantId)
        throw new CustomError("Tenant ID is required", "TENANT_ID_REQUIRED");
      const { month, year } = CategoryBreakdownArgs.parse(args);
      const result = await ctx.dataSources.transactionService.categoryBreakDown(
        ctx.tenantId,
        ctx.userId,
        month,
        year
      );
      if (!result)
        throw new CustomError(
          "No category breakdown found for the selected period",
          "NOT_FOUND"
        );
      return result;
    },

    aggregateSummary: async (
      _: unknown,
      args: { year: number; month?: number },
      ctx: IGraphQLContext
    ) => {
      if (!ctx.userId) throw new CustomError("Unauthorized", "UNAUTHORIZED");
      if (!ctx.tenantId)
        throw new CustomError("Tenant ID is required", "TENANT_ID_REQUIRED");
      const { year, month } = AggregateSummaryArgs.parse(args);
      const result = await ctx.dataSources.transactionService.aggregateSummary(
        ctx.tenantId,
        ctx.userId,
        year,
        month
      );
      if (!result)
        throw new CustomError(
          "No aggregate summary found for the selected period",
          "NOT_FOUND"
        );
      return result;
    },

    transactions: async (
      _: unknown,
      args: {
        filters: {
          year: number;
          month: number;
          bankName?: EBankName;
          category?: string;
        };
        cursor?: string;
      },
      ctx: IGraphQLContext
    ) => {
      if (!ctx.userId) throw new CustomError("Unauthorized", "UNAUTHORIZED");
      if (!ctx.tenantId)
        throw new CustomError("Tenant ID is required", "TENANT_ID_REQUIRED");

      const { filters, cursor } = TransactionsQueryArgs.parse(args);
      const { year, month, bankName, category } = filters;

      const txns =
        await ctx.dataSources.transactionService.filteredTransactions(
          ctx.tenantId,
          ctx.userId,
          year,
          month,
          bankName,
          category
        );
      if (!txns)
        throw new CustomError(
          "No filtered transactions found for the selected criteria",
          "NOT_FOUND"
        );

      const PAGE_SIZE = 20;
      const start = cursor ? parseInt(cursor, 10) : 0;
      const items = txns.slice(start, start + PAGE_SIZE);

      const nextCursor =
        start + PAGE_SIZE < txns.length ? String(start + PAGE_SIZE) : null;

      return { items, cursor: nextCursor };
    },

    categoriesByBase: async (_: unknown, __: unknown, ctx: IGraphQLContext) => {
      if (!ctx.userId) throw new CustomError("Unauthorized", "UNAUTHORIZED");
      if (!ctx.tenantId)
        throw new CustomError("Tenant ID is required", "TENANT_ID_REQUIRED");

      const grouped =
        await ctx.dataSources.transactionCategoryService.getCategoriesByTenant(
          ctx.tenantId
        );
      // Transform to array with enum-compatible keys
      return Object.entries(grouped).map(([base, categories]) => ({
        base,
        categories,
      }));
    },
  },
  Mutation: {
    addTransactionCategory: async (
      _: unknown,
      __: unknown,
      ctx: IGraphQLContext
    ) => {
      if (!ctx.userId) throw new CustomError("Unauthorized", "UNAUTHORIZED");
      if (!ctx.tenantId)
        throw new CustomError("Tenant ID is required", "TENANT_ID_REQUIRED");
      // const { name, keyword } = AddTransactionCategoryArgs.parse(args);
      await ctx.dataSources.transactionCategoryService.addRulesByTenant(
        ctx.tenantId
      );
      return true;
    },

    reclassifyTransaction: async (
      _: unknown,
      args: { id: string; category: string },
      ctx: IGraphQLContext
    ) => {
      if (!ctx.userId) throw new CustomError("Unauthorized", "UNAUTHORIZED");
      if (!ctx.tenantId)
        throw new CustomError("Tenant ID is required", "TENANT_ID_REQUIRED");

      const { id, category } = ReclassifyTransactionArgs.parse(args);

      const taggedBy = ctx.email ?? ctx.userId ?? "USER";
      const result =
        await ctx.dataSources.transactionService.reclassifyTransaction(
          ctx.tenantId,
          id,
          category,
          taggedBy
        );
      return result;
    },
  },
};
