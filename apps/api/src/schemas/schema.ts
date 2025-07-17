import { createSchema } from 'graphql-yoga';
import { authResolvers, uploadStatementResolvers } from './resolvers';
import { authTypeDefs, uploadStatementTypeDefs } from './typeDefs';

export const schema = createSchema({
  typeDefs: [authTypeDefs, uploadStatementTypeDefs],
  resolvers: [authResolvers, uploadStatementResolvers]
});



