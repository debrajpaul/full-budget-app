import {
  IGraphQLContext,
  IRecurringTransaction,
  ERecurringFrequency,
  ETransactionType,
  inferTransactionType,
} from "@common";

const mapRecurring = (r: IRecurringTransaction) => ({
  id: r.recurringId,
  description: r.description,
  amount: r.amount,
  category: r.category,
  // Prefer the stored value; fall back to inference for records that predate the migration.
  type: r.type ?? inferTransactionType(r.amount, r.category),
  frequency: r.frequency,
  dayOfMonth: r.dayOfMonth,
  dayOfWeek: r.dayOfWeek,
  monthOfYear: r.monthOfYear,
  startDate: r.startDate,
  endDate: r.endDate,
  nextRunDate: r.nextRunDate,
});

export const recurringTransactionResolvers = {
  Query: {
    recurringTransactions: async (
      _: unknown,
      __: unknown,
      ctx: IGraphQLContext
    ) => {
      if (!ctx.userId) throw new Error("Unauthorized");
      if (!ctx.tenantId) throw new Error("Tenant ID is required");
      const items = await ctx.dataSources.recurringTransactionService.list(
        ctx.tenantId,
        ctx.userId
      );
      return items.map(mapRecurring);
    },
  },
  Mutation: {
    createRecurringTransaction: async (
      _: unknown,
      args: {
        input: {
          description: string;
          amount: number;
          category?: string;
          type?: ETransactionType;
          frequency: ERecurringFrequency;
          dayOfMonth?: number;
          dayOfWeek?: number;
          monthOfYear?: number;
          startDate: string;
          endDate?: string;
        };
      },
      ctx: IGraphQLContext
    ) => {
      if (!ctx.userId) throw new Error("Unauthorized");
      if (!ctx.tenantId) throw new Error("Tenant ID is required");
      const r = await ctx.dataSources.recurringTransactionService.create(
        ctx.tenantId,
        ctx.userId,
        args.input
      );
      return mapRecurring(r);
    },
    generateRecurringTransactions: async (
      _: unknown,
      args: { month: number; year: number },
      ctx: IGraphQLContext
    ) => {
      if (!ctx.userId) throw new Error("Unauthorized");
      if (!ctx.tenantId) throw new Error("Tenant ID is required");
      const txns =
        await ctx.dataSources.recurringTransactionService.materializeForMonth(
          ctx.tenantId,
          ctx.userId,
          args.month,
          args.year
        );
      return txns.length;
    },
  },
};
