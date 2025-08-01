import { IGraphQLContext } from "@common";

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
      if (!result) throw new Error("Failed to upload statement");
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
      if (!result) throw new Error("Failed to upload statement");
      return result;
    },
  },
};
