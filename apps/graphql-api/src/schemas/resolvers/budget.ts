import { IGraphQLContext } from "@common";

export const budgetResolvers = {
  Mutation: {
    setBudget: async (
      _: unknown,
      args: {
        period: { month: number; year: number };
        category: string;
        amount: number;
      },
      ctx: IGraphQLContext,
    ) => {
      if (!ctx.userId) throw new Error("Unauthorized");
      if (!ctx.tenantId) throw new Error("Tenant ID is required");
      const { month, year } = args.period;
      const budget = await ctx.dataSources.budgetService.setBudget(
        ctx.tenantId,
        ctx.userId,
        {
          month,
          year,
          category: args.category,
          amount: args.amount,
        },
      );
      return {
        id: budget.budgetId,
        month: budget.month,
        year: budget.year,
        category: budget.category,
        amount: budget.amount,
      };
    },
  },
};
