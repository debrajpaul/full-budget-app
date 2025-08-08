import { EBankName, IGraphQLContext } from "@common";
import { UploadStatementArgs } from "../../utils";
import { CustomError } from "@services";

export const uploadStatementResolvers = {
  Mutation: {
    uploadStatement: async (
      _: unknown,
      args: { bank: EBankName; fileName: string; contentBase64: string },
      ctx: IGraphQLContext,
    ) => {
      if (!ctx.userId) throw new CustomError("Unauthorized", "UNAUTHORIZED");
      const { bank, fileName, contentBase64 } = UploadStatementArgs.parse(args);
      const result =
        await ctx.dataSources.uploadStatementService.uploadStatement({
          bank,
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
