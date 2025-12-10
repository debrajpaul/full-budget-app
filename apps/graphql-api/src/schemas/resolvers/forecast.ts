import { IGraphQLContext } from "@common";
import { CustomError } from "@services";

export const forecastResolvers = {
  Query: {
    forecastMonth: async (
      _: unknown,
      args: {
        year: number;
        month: number;
        options?: {
          startingBalance?: number;
          lowBalanceThreshold?: number;
          largeExpenseThreshold?: number;
        };
      },
      ctx: IGraphQLContext
    ) => {
      if (!ctx.userId) throw new CustomError("Unauthorized", "UNAUTHORIZED");
      if (!ctx.tenantId)
        throw new CustomError("Tenant ID is required", "TENANT_ID_REQUIRED");
      return ctx.dataSources.forecastService.forecastMonth(
        ctx.tenantId,
        ctx.userId,
        args.year,
        args.month,
        args.options
      );
    },
  },
};
