import { IGraphQLContext, IRegisterInput, ILoginInput } from "@common";
import { RegisterArgs, LoginArgs } from "../../utils";
import { CustomError } from "@services";

export const authResolvers = {
  Query: {
    apiVersion: () => "v1.0.0",
    healthCheck: () => "API is healthy",
  },
  Mutation: {
    register: async (
      _: unknown,
      args: { input: IRegisterInput },
      ctx: IGraphQLContext,
    ) => {
      const authService = ctx.dataSources.authorizationService;
      if (!authService)
        throw new CustomError(
          "Authorization service not found",
          "SERVICE_NOT_FOUND",
        );
      const { email, name, password } = RegisterArgs.parse(args.input);
      return await authService.register({ email, name, password });
    },
    login: async (
      _: unknown,
      args: { input: ILoginInput },
      ctx: IGraphQLContext,
    ) => {
      const authService = ctx.dataSources.authorizationService;
      if (!authService)
        throw new CustomError(
          "Authorization service not found",
          "SERVICE_NOT_FOUND",
        );
      const { email, password } = LoginArgs.parse(args.input);
      return await authService.login({ email, password });
    },
  },
};
