import { makeExecutableSchema } from "@graphql-tools/schema";
import {
  authResolvers,
  uploadStatementResolvers,
  transactionResolvers,
  tenantResolvers,
  savingsGoalResolvers,
} from "./resolvers";
import {
  authTypeDefs,
  uploadStatementTypeDefs,
  commonTypeDefs,
  transactionTypeDefs,
  tenantTypeDefs,
  savingsGoalTypeDefs,
} from "./typeDefs";

export const schema = makeExecutableSchema({
  typeDefs: [
    commonTypeDefs,
    authTypeDefs,
    transactionTypeDefs,
    uploadStatementTypeDefs,
    tenantTypeDefs,
    savingsGoalTypeDefs,
  ],
  resolvers: [
    authResolvers,
    uploadStatementResolvers,
    transactionResolvers,
    tenantResolvers,
    savingsGoalResolvers,
  ],
});
