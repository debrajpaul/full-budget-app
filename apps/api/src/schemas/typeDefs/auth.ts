export const authTypeDefs = /* GraphQL */ `
  type AuthPayload {
    email: String!
    token: String!
  }

  type Query {
    hello: String!
  }

  type Mutation {
    register(email: String!, password: String!): AuthPayload!
    login(email: String!, password: String!): AuthPayload!
  }
`;
