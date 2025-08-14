import {
  MonthlyReviewArgs,
  AnnualReviewArgs,
  CategoryBreakdownArgs,
  AggregateSummaryArgs,
  FilteredTransactionsArgs,
  // AddTransactionCategoryArgs,
} from "../../utils";
import { IGraphQLContext, EBankName } from "@common";
import { CustomError } from "@services";

export const transactionResolvers = {
  Query: {
    async monthlyReview(
      _: unknown,
      args: { month: number; year: number },
      ctx: IGraphQLContext,
    ) {
      if (!ctx.userId) throw new CustomError("Unauthorized", "UNAUTHORIZED");
      if (!ctx.tenantId)
        throw new CustomError("Tenant ID is required", "TENANT_ID_REQUIRED");
      const { month, year } = MonthlyReviewArgs.parse(args);
      const result = await ctx.dataSources.transactionService.monthlyReview(
        ctx.tenantId,
        ctx.userId,
        month,
        year,
      );
      if (!result)
        throw new CustomError(
          "No transactions found for the selected period",
          "NOT_FOUND",
        );
      return result;
    },

    async annualReview(
      _: unknown,
      args: { year: number },
      ctx: IGraphQLContext,
    ) {
      if (!ctx.userId) throw new CustomError("Unauthorized", "UNAUTHORIZED");
      if (!ctx.tenantId)
        throw new CustomError("Tenant ID is required", "TENANT_ID_REQUIRED");
      const { year } = AnnualReviewArgs.parse(args);
      const result = await ctx.dataSources.transactionService.annualReview(
        ctx.tenantId,
        ctx.userId,
        year,
      );
      if (!result)
        throw new CustomError(
          "No transactions found for the selected year",
          "NOT_FOUND",
        );
      return result;
    },

    async categoryBreakdown(
      _: unknown,
      args: { month: number; year: number },
      ctx: IGraphQLContext,
    ) {
      if (!ctx.userId) throw new CustomError("Unauthorized", "UNAUTHORIZED");
      if (!ctx.tenantId)
        throw new CustomError("Tenant ID is required", "TENANT_ID_REQUIRED");
      const { month, year } = CategoryBreakdownArgs.parse(args);
      const result = await ctx.dataSources.transactionService.categoryBreakDown(
        ctx.tenantId,
        ctx.userId,
        month,
        year,
      );
      if (!result)
        throw new CustomError(
          "No category breakdown found for the selected period",
          "NOT_FOUND",
        );
      return result;
    },

    async aggregateSummary(
      _: unknown,
      args: { year: number; month?: number },
      ctx: IGraphQLContext,
    ) {
      if (!ctx.userId) throw new CustomError("Unauthorized", "UNAUTHORIZED");
      if (!ctx.tenantId)
        throw new CustomError("Tenant ID is required", "TENANT_ID_REQUIRED");
      const { year, month } = AggregateSummaryArgs.parse(args);
      const result = await ctx.dataSources.transactionService.aggregateSummary(
        ctx.tenantId,
        ctx.userId,
        year,
        month,
      );
      if (!result)
        throw new CustomError(
          "No aggregate summary found for the selected period",
          "NOT_FOUND",
        );
      return result;
    },

    async filteredTransactions(
      _: unknown,
      args: {
        year: number;
        month: number;
        bankName?: EBankName;
        category?: string;
      },
      ctx: IGraphQLContext,
    ) {
      if (!ctx.userId) throw new CustomError("Unauthorized", "UNAUTHORIZED");
      if (!ctx.tenantId)
        throw new CustomError("Tenant ID is required", "TENANT_ID_REQUIRED");
      const { year, month, bankName, category } =
        FilteredTransactionsArgs.parse(args);
      const result =
        await ctx.dataSources.transactionService.filteredTransactions(
          ctx.tenantId,
          ctx.userId,
          year,
          month,
          bankName,
          category,
        );
      if (!result)
        throw new CustomError(
          "No filtered transactions found for the selected criteria",
          "NOT_FOUND",
        );
      return result;
    },

    async addTransactionCategory(
      _: unknown,
      __: unknown,
      // args: { rules: Record<string, string> },
      ctx: IGraphQLContext,
    ) {
      if (!ctx.userId) throw new CustomError("Unauthorized", "UNAUTHORIZED");
      if (!ctx.tenantId)
        throw new CustomError("Tenant ID is required", "TENANT_ID_REQUIRED");
      // const { name, keyword } = AddTransactionCategoryArgs.parse(args);
      await ctx.dataSources.transactionCategoryService.addRulesByTenant(
        ctx.tenantId,
        {}, // name, keyword
      );
      return true;
    },
  },
};
