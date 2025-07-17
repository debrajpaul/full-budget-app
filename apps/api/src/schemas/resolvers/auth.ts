import { IGraphQLContext } from '@core/abstractions/IContext';

export const authResolvers = {
  Query: {
    hello: () => 'Hello World'
  },
  Mutation: {
    register: async (_:any, { email, password }:any, ctx: IGraphQLContext) => {
      const authService = ctx.dataSources.authorizationService;
      if (!authService) throw new Error("Authorization service not found");

      return await authService.register(email, password);
    },
    login: async (_:any, { email, password }:any, ctx: IGraphQLContext) => {
      const authService = ctx.dataSources.authorizationService;
      if (!authService) throw new Error("Authorization service not found");

      return await authService.login(email, password);
    }
  },
};
