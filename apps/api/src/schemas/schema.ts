import { makeExecutableSchema } from "@graphql-tools/schema";
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

export const schema = makeExecutableSchema({
  typeDefs: [
    authTypeDefs,
    uploadStatementTypeDefs,
    commonTypeDefs,
    transactionTypeDefs,
  ],
  resolvers: [authResolvers, uploadStatementResolvers, transactionResolvers],
});
