import { IGraphQLContext, IRegisterInput, ILoginInput } from "@common";

export const authResolvers = {
  Query: {
    hello: () => "Hello World",
  },
  Mutation: {
    register: async (
      _: any,
      args: { input: IRegisterInput },
      ctx: IGraphQLContext,
    ) => {
      const authService = ctx.dataSources.authorizationService;
      if (!authService) throw new Error("Authorization service not found");
      const { email, name, password } = args.input;
      return await authService.register({ email, name, password });
    },
    login: async (
      _: any,
      args: { input: ILoginInput },
      ctx: IGraphQLContext,
    ) => {
      const authService = ctx.dataSources.authorizationService;
      if (!authService) throw new Error("Authorization service not found");
      const { email, password } = args.input;
      return await authService.login({ email, password });
    },
  },
};
