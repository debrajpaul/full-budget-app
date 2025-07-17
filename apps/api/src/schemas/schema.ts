import { createSchema } from 'graphql-yoga';
import { authResolvers, budgetResolvers, uploadStatementResolvers } from './resolvers';
import { authTypeDefs, budgetTypeDefs, uploadStatementTypeDefs } from './typeDefs';

export const schema = createSchema({
  typeDefs: [authTypeDefs, budgetTypeDefs, uploadStatementTypeDefs],
  resolvers: [authResolvers, budgetResolvers, uploadStatementResolvers]
});



