import { makeExecutableSchema } from "@graphql-tools/schema";
import {
  authResolvers,
  uploadStatementResolvers,
  transactionResolvers,
  tenantResolvers,
  savingsGoalResolvers,
  recurringTransactionResolvers,
} from "./resolvers";
import {
  authTypeDefs,
  uploadStatementTypeDefs,
  commonTypeDefs,
  transactionTypeDefs,
  tenantTypeDefs,
  savingsGoalTypeDefs,
  recurringTransactionTypeDefs,
} from "./typeDefs";

export const schema = makeExecutableSchema({
  typeDefs: [
    commonTypeDefs,
    authTypeDefs,
    transactionTypeDefs,
    uploadStatementTypeDefs,
    tenantTypeDefs,
    savingsGoalTypeDefs,
    recurringTransactionTypeDefs,
  ],
  resolvers: [
    authResolvers,
    uploadStatementResolvers,
    transactionResolvers,
    tenantResolvers,
    savingsGoalResolvers,
    recurringTransactionResolvers,
  ],
});
