import { IGraphQLContext, EBaseCategories } from "@common";

export const budgetResolvers = {
  Query: {
    budgets: async (
      _: unknown,
      args: { period: { month: number; year: number } },
      ctx: IGraphQLContext
    ) => {
      if (!ctx.userId) throw new Error("Unauthorized");
      if (!ctx.tenantId) throw new Error("Tenant ID is required");
      const budgets = await ctx.dataSources.budgetService.getBudgets(
        ctx.tenantId,
        ctx.userId,
        args.period
      );
      return budgets.map((b) => ({
        id: b.budgetId,
        month: b.month,
        year: b.year,
        category: b.category,
        amount: b.amount,
      }));
    },
  },
  Mutation: {
    setBudget: async (
      _: unknown,
      args: {
        period: { month: number; year: number };
        category: string;
        amount: number;
      },
      ctx: IGraphQLContext
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
          category: args.category as EBaseCategories,
          amount: args.amount,
        }
      );
      return {
        id: budget.budgetId,
        month: budget.month,
        year: budget.year,
        category: budget.category,
        amount: budget.amount,
      };
    },
    deleteBudget: async (
      _: unknown,
      args: { id: string },
      ctx: IGraphQLContext
    ) => {
      if (!ctx.userId) throw new Error("Unauthorized");
      if (!ctx.tenantId) throw new Error("Tenant ID is required");
      return ctx.dataSources.budgetService.deleteBudget(
        ctx.tenantId,
        ctx.userId,
        args.id
      );
    },
  },
};
