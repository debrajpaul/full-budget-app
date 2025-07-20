import dotenv from "dotenv";
import { config } from "./environment";
import { createServer } from "node:http";
import { createYoga } from "graphql-yoga";
import { schema } from "./schemas/schema";
import { createContext } from "./context";
import { IGraphQLContext } from "@common";

dotenv.config();

const yoga = createYoga<IGraphQLContext>({
  schema,
  context: createContext,
  healthCheckEndpoint: "/health",
});

const server = createServer(yoga);
server.listen(config.port, () => {
  console.info(`Server is running on http://localhost:${config.port}/graphql`);
});
