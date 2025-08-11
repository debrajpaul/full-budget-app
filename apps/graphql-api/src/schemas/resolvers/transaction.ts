import {
  MonthlyReviewArgs,
  AnnualReviewArgs,
  CategoryBreakdownArgs,
  AggregateSummaryArgs,
  FilteredTransactionsArgs,
} from "../../utils";
import { IGraphQLContext, EBankName } from "@common";
import { CustomError } from "@services";

export const transactionResolvers = {
  Query: {
    async monthlyReview(
      _: unknown,
      args: { month: number; year: number },
      context: IGraphQLContext,
    ) {
      if (!context.userId)
        throw new CustomError("Unauthorized", "UNAUTHORIZED");
      if (!context.tenantId)
        throw new CustomError("Tenant ID is required", "TENANT_ID_REQUIRED");
      const { month, year } = MonthlyReviewArgs.parse(args);
      const result = await context.dataSources.transactionService.monthlyReview(
        context.tenantId,
        context.userId,
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
      context: IGraphQLContext,
    ) {
      if (!context.userId)
        throw new CustomError("Unauthorized", "UNAUTHORIZED");
      if (!context.tenantId)
        throw new CustomError("Tenant ID is required", "TENANT_ID_REQUIRED");
      const { year } = AnnualReviewArgs.parse(args);
      const result = await context.dataSources.transactionService.annualReview(
        context.tenantId,
        context.userId,
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
      context: IGraphQLContext,
    ) {
      if (!context.userId)
        throw new CustomError("Unauthorized", "UNAUTHORIZED");
      if (!context.tenantId)
        throw new CustomError("Tenant ID is required", "TENANT_ID_REQUIRED");
      const { month, year } = CategoryBreakdownArgs.parse(args);
      const result =
        await context.dataSources.transactionService.categoryBreakDown(
          context.tenantId,
          context.userId,
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
      context: IGraphQLContext,
    ) {
      if (!context.userId)
        throw new CustomError("Unauthorized", "UNAUTHORIZED");
      if (!context.tenantId)
        throw new CustomError("Tenant ID is required", "TENANT_ID_REQUIRED");
      const { year, month } = AggregateSummaryArgs.parse(args);
      const result =
        await context.dataSources.transactionService.aggregateSummary(
          context.tenantId,
          context.userId,
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
      context: IGraphQLContext,
    ) {
      if (!context.userId)
        throw new CustomError("Unauthorized", "UNAUTHORIZED");
      if (!context.tenantId)
        throw new CustomError("Tenant ID is required", "TENANT_ID_REQUIRED");
      const { year, month, bankName, category } =
        FilteredTransactionsArgs.parse(args);
      const result =
        await context.dataSources.transactionService.filteredTransactions(
          context.tenantId,
          context.userId,
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
  },
};
