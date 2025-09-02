import type {
  APIGatewayProxyEvent,
  Context,
  APIGatewayProxyResult,
} from "aws-lambda";
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

const baseHandler = startServerAndCreateLambdaHandler(
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

export const handler = async (
  event: APIGatewayProxyEvent,
  context: Context,
): Promise<APIGatewayProxyResult> => {
  // Prefer promise form if available to avoid unresolved callbacks
  const promiseHandler = baseHandler as unknown as (
    e: APIGatewayProxyEvent,
    c: Context,
  ) => Promise<APIGatewayProxyResult>;
  const resp = await promiseHandler(event, context);
  const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "Content-Type,Authorization",
    "Access-Control-Allow-Methods": "POST,OPTIONS",
  } as const;
  return {
    ...resp,
    headers: { ...(resp?.headers || {}), ...corsHeaders },
  };
};
