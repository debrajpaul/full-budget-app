import { IGraphQLContext } from "@common";
import { CustomError } from "@services";

export const sinkingFundResolvers = {
  Query: {
    sinkingFunds: async (_: unknown, __: unknown, ctx: IGraphQLContext) => {
      if (!ctx.userId) throw new CustomError("Unauthorized", "UNAUTHORIZED");
      if (!ctx.tenantId)
        throw new CustomError("Tenant ID is required", "TENANT_ID_REQUIRED");
      return ctx.dataSources.sinkingFundService.getSinkingFunds(
        ctx.tenantId,
        ctx.userId
      );
    },
  },
  Mutation: {
    createSinkingFund: async (
      _: unknown,
      args: {
        input: {
          name: string;
          target: number;
          monthlyContribution?: number;
          deadline?: string;
        };
      },
      ctx: IGraphQLContext
    ) => {
      if (!ctx.userId) throw new CustomError("Unauthorized", "UNAUTHORIZED");
      if (!ctx.tenantId)
        throw new CustomError("Tenant ID is required", "TENANT_ID_REQUIRED");
      return ctx.dataSources.sinkingFundService.createSinkingFund(
        ctx.tenantId,
        ctx.userId,
        args.input
      );
    },

    updateSinkingFund: async (
      _: unknown,
      args: {
        id: string;
        input: {
          name?: string;
          target?: number;
          monthlyContribution?: number;
          deadline?: string;
        };
      },
      ctx: IGraphQLContext
    ) => {
      if (!ctx.userId) throw new CustomError("Unauthorized", "UNAUTHORIZED");
      if (!ctx.tenantId)
        throw new CustomError("Tenant ID is required", "TENANT_ID_REQUIRED");
      return ctx.dataSources.sinkingFundService.updateSinkingFund(
        ctx.tenantId,
        ctx.userId,
        args.id,
        args.input
      );
    },

    contributeSinkingFund: async (
      _: unknown,
      args: { input: { id: string; amount: number } },
      ctx: IGraphQLContext
    ) => {
      if (!ctx.userId) throw new CustomError("Unauthorized", "UNAUTHORIZED");
      if (!ctx.tenantId)
        throw new CustomError("Tenant ID is required", "TENANT_ID_REQUIRED");
      return ctx.dataSources.sinkingFundService.contributeSinkingFund(
        ctx.tenantId,
        ctx.userId,
        args.input.id,
        args.input.amount
      );
    },

    deleteSinkingFund: async (
      _: unknown,
      args: { id: string },
      ctx: IGraphQLContext
    ) => {
      if (!ctx.userId) throw new CustomError("Unauthorized", "UNAUTHORIZED");
      if (!ctx.tenantId)
        throw new CustomError("Tenant ID is required", "TENANT_ID_REQUIRED");
      return ctx.dataSources.sinkingFundService.deleteSinkingFund(
        ctx.tenantId,
        ctx.userId,
        args.id
      );
    },
  },
};
