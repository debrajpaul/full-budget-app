import { makeExecutableSchema } from "@graphql-tools/schema";
import { DateScalar } from "./scalars";
import {
  authResolvers,
  uploadStatementResolvers,
  transactionResolvers,
  tenantResolvers,
  savingsGoalResolvers,
  sinkingFundResolvers,
  forecastResolvers,
  recurringTransactionResolvers,
  budgetResolvers,
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
  budgetTypeDefs,
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
    budgetTypeDefs,
  ],
  resolvers: [
    { Date: DateScalar },
    authResolvers,
    uploadStatementResolvers,
    transactionResolvers,
    tenantResolvers,
    savingsGoalResolvers,
    sinkingFundResolvers,
    forecastResolvers,
    recurringTransactionResolvers,
    budgetResolvers,
  ],
});
