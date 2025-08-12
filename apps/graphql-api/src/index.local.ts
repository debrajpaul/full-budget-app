import dotenv from "dotenv";
import { config } from "./environment";
import { ApolloServer } from "@apollo/server";
import { expressMiddleware } from "@as-integrations/express5";
import { ApolloServerPluginDrainHttpServer } from "@apollo/server/plugin/drainHttpServer";
import express from "express";
import cors from "cors";
import http from "http";
import { schema } from "./schemas/schema";
import { createContext } from "./context";
import { IGraphQLContext } from "@common";

dotenv.config();
async function startServer() {
  const app = express();
  const httpServer = http.createServer(app);

  const server = new ApolloServer<IGraphQLContext>({
    schema,
    cache: "bounded",
    introspection: config.nodeEnv !== "prod",
    plugins: [ApolloServerPluginDrainHttpServer({ httpServer })],
  });
  await server.start();

  app.use(
    cors(),
    express.json(),
    expressMiddleware(server, {
      context: createContext,
    }),
  );

  httpServer.listen(config.port, () => {
    console.log(
      `🚀 Apollo Server ready at http://localhost:${config.port}/graphql`,
    );
  });
}

startServer();
