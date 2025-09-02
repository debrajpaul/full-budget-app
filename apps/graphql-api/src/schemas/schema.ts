import { makeExecutableSchema } from "@graphql-tools/schema";
import {
  authResolvers,
  uploadStatementResolvers,
  transactionResolvers,
  tenantResolvers,
  savingsGoalResolvers,
  sinkingFundResolvers,
  forecastResolvers,
  recurringTransactionResolvers,
} from "./resolvers";
import {
  authTypeDefs,
  uploadStatementTypeDefs,
  commonTypeDefs,
  transactionTypeDefs,
  tenantTypeDefs,
  savingsGoalTypeDefs,
  sinkingFundTypeDefs,
  forecastTypeDefs,
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
    sinkingFundTypeDefs,
    forecastTypeDefs,
    recurringTransactionTypeDefs,
  ],
  resolvers: [
    authResolvers,
    uploadStatementResolvers,
    transactionResolvers,
    tenantResolvers,
    savingsGoalResolvers,
    sinkingFundResolvers,
    forecastResolvers,
    recurringTransactionResolvers,
  ],
});
