export const authTypeDefs = /* GraphQL */ `
  type Query {
    apiVersion: String!
    healthCheck: String!
  }

  input RegisterInput {
    email: String!
    name: String!
    tenantId: String!
    password: String!
  }

  type RegisterResponse {
    success: Boolean!
    message: String!
  }

  input LoginInput {
    email: String!
    tenantId: String!
    password: String!
  }

  type User {
    email: String!
    name: String!
    tenantId: String!
    isActive: Boolean!
  }

  type LoginResponse {
    user: User!
    token: String!
  }

  type Mutation {
    register(input: RegisterInput!): RegisterResponse!
    login(input: LoginInput!): LoginResponse!
  }
`;
