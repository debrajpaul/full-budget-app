import { IGraphQLContext } from "@common";
import { CustomError } from "@services";

export const savingsGoalResolvers = {
  Query: {
    savingsGoals: async (_: unknown, __: unknown, ctx: IGraphQLContext) => {
      if (!ctx.userId) throw new CustomError("Unauthorized", "UNAUTHORIZED");
      if (!ctx.tenantId)
        throw new CustomError("Tenant ID is required", "TENANT_ID_REQUIRED");
      return ctx.dataSources.savingsGoalService.getSavingsGoals(
        ctx.tenantId,
        ctx.userId,
      );
    },
  },
};