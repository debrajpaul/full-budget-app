import { IGraphQLContext } from "@common";
import { CustomError } from "@services";

function assertAuth(ctx: IGraphQLContext): {
  tenantId: NonNullable<IGraphQLContext["tenantId"]>;
  userId: string;
} {
  if (!ctx.userId) throw new CustomError("Unauthorized", "UNAUTHORIZED");
  if (!ctx.tenantId)
    throw new CustomError("Tenant ID is required", "TENANT_ID_REQUIRED");
  return { tenantId: ctx.tenantId, userId: ctx.userId };
}

export const savingsGoalResolvers = {
  Query: {
    savingsGoals: async (_: unknown, __: unknown, ctx: IGraphQLContext) => {
      const { tenantId, userId } = assertAuth(ctx);
      return ctx.dataSources.savingsGoalService.getSavingsGoals(
        tenantId,
        userId
      );
    },
  },
  Mutation: {
    createSavingsGoal: async (
      _: unknown,
      args: {
        input: {
          name: string;
          target: number;
          deadline: string;
          initialAmount?: number;
        };
      },
      ctx: IGraphQLContext
    ) => {
      const { tenantId, userId } = assertAuth(ctx);
      return ctx.dataSources.savingsGoalService.createSavingsGoal(
        tenantId,
        userId,
        args.input
      );
    },
    updateSavingsGoal: async (
      _: unknown,
      args: {
        id: string;
        input: { name?: string; target?: number; deadline?: string };
      },
      ctx: IGraphQLContext
    ) => {
      const { tenantId, userId } = assertAuth(ctx);
      return ctx.dataSources.savingsGoalService.updateSavingsGoal(
        tenantId,
        userId,
        args.id,
        args.input
      );
    },
    deleteSavingsGoal: async (
      _: unknown,
      args: { id: string },
      ctx: IGraphQLContext
    ) => {
      const { tenantId, userId } = assertAuth(ctx);
      return ctx.dataSources.savingsGoalService.deleteSavingsGoal(
        tenantId,
        userId,
        args.id
      );
    },
    contributeSavingsGoal: async (
      _: unknown,
      args: { input: { id: string; amount: number } },
      ctx: IGraphQLContext
    ) => {
      const { tenantId, userId } = assertAuth(ctx);
      return ctx.dataSources.savingsGoalService.contributeSavingsGoal(
        tenantId,
        userId,
        args.input
      );
    },
  },
};
