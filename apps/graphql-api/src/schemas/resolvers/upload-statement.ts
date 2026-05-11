import {
  IStatementInput,
  ICreateUploadUrlInput,
  IGraphQLContext,
} from "@common";
import { UploadStatementArgs } from "../../utils";

import { CustomError } from "@services";

const assertAuth = (ctx: IGraphQLContext) => {
  if (!ctx.userId) throw new CustomError("Unauthorized", "UNAUTHORIZED");
  if (!ctx.tenantId)
    throw new CustomError("Tenant ID is required", "TENANT_ID_REQUIRED");
};

export const uploadStatementResolvers = {
  Mutation: {
    uploadStatement: async (
      _: unknown,
      args: { input: IStatementInput },
      ctx: IGraphQLContext
    ) => {
      assertAuth(ctx);
      ctx.logger.debug(
        `User ${ctx.userId} is uploading a statement for bank ${args.input.bankName} and file name: ${args.input.fileName}`
      );
      const { bankName, bankType, fileName, contentBase64 } =
        UploadStatementArgs.parse(args.input);
      return ctx.dataSources.uploadStatementService.uploadStatement({
        bankName,
        bankType,
        fileName,
        contentBase64,
        userId: ctx.userId!,
        tenantId: ctx.tenantId!,
      });
    },

    createUploadUrl: async (
      _: unknown,
      args: { input: ICreateUploadUrlInput },
      ctx: IGraphQLContext
    ) => {
      assertAuth(ctx);
      return ctx.dataSources.uploadUrlService.createUploadUrl(
        ctx.tenantId!,
        ctx.userId!,
        args.input
      );
    },

    notifyUploadComplete: async (
      _: unknown,
      args: { jobId: string },
      ctx: IGraphQLContext
    ) => {
      assertAuth(ctx);
      return ctx.dataSources.uploadUrlService.notifyUploadComplete(
        ctx.tenantId!,
        ctx.userId!,
        args.jobId
      );
    },
  },
};
