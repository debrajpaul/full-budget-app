import { EBankName, IGraphQLContext } from "@common";
import { UploadStatementArgs } from "../../utils";

export const uploadStatementResolvers = {
  Mutation: {
    uploadStatement: async (
      _: any,
      args: { bank: EBankName; fileName: string; contentBase64: string },
      ctx: IGraphQLContext,
    ) => {
      if (!ctx.userId) throw new Error("Unauthorized");
      const { bank, fileName, contentBase64 } = UploadStatementArgs.parse(args);
      const result =
        await ctx.dataSources.uploadStatementService.uploadStatement(
          bank,
          fileName,
          contentBase64,
          ctx.userId,
        );

      if (!result) throw new Error("Failed to upload statement");
      return true;
    },
  },
};
