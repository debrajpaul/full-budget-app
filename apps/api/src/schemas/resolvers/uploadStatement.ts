import { IGraphQLContext } from "packages/common/src/abstractions/IContext";

export const uploadStatementResolvers = {
  Mutation: {
    uploadStatement: async (
      _: any,
      { bank, fileName, contentBase64 }: any,
      ctx: IGraphQLContext,
    ) => {
      if (!ctx.userId) throw new Error("Unauthorized");

      if (!bank || !fileName || !contentBase64) {
        throw new Error("Missing required parameters");
      }

      const result =
        await ctx.dataSources.uploadStatementService.uploadStatement(
          bank,
          fileName,
          contentBase64,
          ctx.userId,
        );

      if (!result) {
        throw new Error("Failed to upload statement");
      }

      return true;
    },
  },
};
