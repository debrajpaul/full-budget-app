import { ApolloServer } from "@apollo/server";
import {
  startServerAndCreateLambdaHandler,
  handlers,
} from "@as-integrations/aws-lambda";
import { schema } from "./schemas/schema";
import { IGraphQLContext } from "@common";
import { createContext } from "./context";
import { config } from "./environment";

const server = new ApolloServer<IGraphQLContext>({
  schema,
  cache: "bounded",
  introspection: config.nodeEnv !== "prod",
});

export const handler = startServerAndCreateLambdaHandler(
  server,
  handlers.createAPIGatewayProxyEventRequestHandler(),
  {
    context: async ({ event, context }) => {
      return createContext({
        event,
        context,
      });
    },
  },
);
