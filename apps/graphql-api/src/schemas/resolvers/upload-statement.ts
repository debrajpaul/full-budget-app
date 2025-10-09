import { IStatementInput, IGraphQLContext } from "@common";
import { UploadStatementArgs } from "../../utils";
import { CustomError } from "@services";

export const uploadStatementResolvers = {
  Mutation: {
    uploadStatement: async (
      _: unknown,
      args: { input: IStatementInput },
      ctx: IGraphQLContext,
    ) => {
      if (!ctx.userId) throw new CustomError("Unauthorized", "UNAUTHORIZED");
      if (!ctx.tenantId)
        throw new CustomError("Tenant ID is required", "TENANT_ID_REQUIRED");
      ctx.logger.info(
        `User ${ctx.userId} is uploading a statement for bank ${args.input.bankName}`,
      );
      ctx.logger.debug(`File name: ${args.input.fileName}`);
      const { bankName, bankType, fileName, contentBase64 } = UploadStatementArgs.parse(
        args.input,
      );
      const result =
        await ctx.dataSources.uploadStatementService.uploadStatement({
          bankName,
          bankType,
          fileName,
          contentBase64,
          userId: ctx.userId!,
          tenantId: ctx.tenantId!,
        });
      if (!result)
        throw new CustomError("Failed to upload statement", "UPLOAD_FAILED");
      return true;
    },
  },
};
