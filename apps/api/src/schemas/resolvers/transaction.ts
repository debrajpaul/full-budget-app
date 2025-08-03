import { IGraphQLContext, EBankName } from "@common";

export const transactionResolvers = {
  Query: {
    async monthlyReview(
      _: any,
      { month, year }: { month: number; year: number },
      context: IGraphQLContext,
    ) {
      if (!context.userId) throw new Error("Unauthorized");
      if (!month || !year) throw new Error("Missing required parameters");

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
      { year }: { year: number },
      context: IGraphQLContext,
    ) {
      if (!context.userId) throw new Error("Unauthorized");
      if (!year) throw new Error("Missing required parameters");

      const result = await context.dataSources.transactionService.annualReview(
        context.userId,
        year,
      );
      if (!result) throw new Error("Failed to get annual review statement");
      return result;
    },

    async categoryBreakdown(
      _: any,
      { month, year }: { month: number; year: number },
      context: IGraphQLContext,
    ) {
      if (!context.userId) throw new Error("Unauthorized");
      if (!month || !year) throw new Error("Missing required parameters");

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
      const { year, month } = args;
      if (!year) throw new Error("Missing required parameters");
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
      {
        year,
        month,
        bankName,
        category,
      }: {
        year: number;
        month: number;
        bankName?: EBankName;
        category?: string;
      },
      context: IGraphQLContext,
    ) {
      if (!context.userId) throw new Error("Unauthorized");
      if (!year || !month) throw new Error("Missing required parameters");
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
