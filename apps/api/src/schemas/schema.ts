import { createSchema } from "graphql-yoga";
import {
  authResolvers,
  uploadStatementResolvers,
  transactionResolvers,
} from "./resolvers";
import {
  authTypeDefs,
  uploadStatementTypeDefs,
  commonTypeDefs,
  transactionTypeDefs,
} from "./typeDefs";

export const schema = createSchema({
  typeDefs: [
    authTypeDefs,
    uploadStatementTypeDefs,
    commonTypeDefs,
    transactionTypeDefs,
  ],
  resolvers: [authResolvers, uploadStatementResolvers, transactionResolvers],
});
