import {
  MonthlyReviewArgs,
  AnnualReviewArgs,
  CategoryBreakdownArgs,
  AggregateSummaryArgs,
  FilteredTransactionsArgs,
} from "../../utils";
import { IGraphQLContext, EBankName } from "@common";

export const transactionResolvers = {
  Query: {
    async monthlyReview(
      _: any,
      args: { month: number; year: number },
      context: IGraphQLContext,
    ) {
      if (!context.userId) throw new Error("Unauthorized");
      const { month, year } = MonthlyReviewArgs.parse(args);
      const result = await context.dataSources.transactionService.monthlyReview(
        context.userId,
        month,
        year,
      );
      if (!result) throw new Error("Failed to get monthly review statement");
      return result;
    },

    async annualReview(
      _: any,
      args: { year: number },
      context: IGraphQLContext,
    ) {
      if (!context.userId) throw new Error("Unauthorized");
      const { year } = AnnualReviewArgs.parse(args);
      const result = await context.dataSources.transactionService.annualReview(
        context.userId,
        year,
      );
      if (!result) throw new Error("Failed to get annual review statement");
      return result;
    },

    async categoryBreakdown(
      _: any,
      args: { month: number; year: number },
      context: IGraphQLContext,
    ) {
      if (!context.userId) throw new Error("Unauthorized");
      const { month, year } = CategoryBreakdownArgs.parse(args);
      const result =
        await context.dataSources.transactionService.categoryBreakDown(
          context.userId,
          month,
          year,
        );
      if (!result)
        throw new Error("Failed to get category breakdown statement");
      return result;
    },

    async aggregateSummary(
      _: any,
      args: { year: number; month?: number },
      context: IGraphQLContext,
    ) {
      if (!context.userId) throw new Error("Unauthorized");
      const { year, month } = AggregateSummaryArgs.parse(args);
      const result =
        await context.dataSources.transactionService.aggregateSummary(
          context.userId,
          year,
          month,
        );
      if (!result) throw new Error("Failed to get aggregate summary statement");
      return result;
    },

    async filteredTransactions(
      _: any,
      args: {
        year: number;
        month: number;
        bankName?: EBankName;
        category?: string;
      },
      context: IGraphQLContext,
    ) {
      if (!context.userId) throw new Error("Unauthorized");
      const { year, month, bankName, category } =
        FilteredTransactionsArgs.parse(args);
      const result =
        await context.dataSources.transactionService.filteredTransactions(
          context.userId,
          year,
          month,
          bankName,
          category,
        );
      if (!result)
        throw new Error("Failed to get filtered transactions statement");
      return result;
    },
  },
};
