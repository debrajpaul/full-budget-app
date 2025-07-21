import { IGraphQLContext } from "@common";

export const authResolvers = {
  Query: {
    hello: () => "Hello World",
  },
  Mutation: {
    register: async (
      _: any,
      args: { input: { email: string; name: string; password: string } },
      ctx: IGraphQLContext,
    ) => {
      const authService = ctx.dataSources.authorizationService;
      if (!authService) throw new Error("Authorization service not found");
      const { email, name, password } = args.input;
      return await authService.register({ email, name, password });
    },
    login: async (_: any, { email, password }: any, ctx: IGraphQLContext) => {
      const authService = ctx.dataSources.authorizationService;
      if (!authService) throw new Error("Authorization service not found");

      return await authService.login({ email, password });
    },
  },
};
