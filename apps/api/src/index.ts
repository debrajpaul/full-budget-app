import { ApolloServer } from "@apollo/server";
import {
  startServerAndCreateLambdaHandler,
  handlers,
} from "@as-integrations/aws-lambda";
import { schema } from "./schemas/schema";
import { IGraphQLContext } from "@common";
import { createContext } from "./context";

const server = new ApolloServer<IGraphQLContext>({
  schema,
  cache: "bounded",
});

export const handler = startServerAndCreateLambdaHandler(
  server,
  handlers.createAPIGatewayProxyEventV2RequestHandler(),
  {
    context: async ({ event, context }) => {
      return createContext({
        event,
        context,
      });
    },
  },
);
