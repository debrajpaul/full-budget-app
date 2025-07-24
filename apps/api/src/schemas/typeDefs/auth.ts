export const authTypeDefs = /* GraphQL */ `
  type Query {
    hello: String!
  }

  input RegisterInput {
    email: String!
    name: String!
    password: String!
  }

  type RegisterResponse {
    success: Boolean!
    message: String!
  }

  input LoginInput {
    email: String!
    password: String!
  }

  type User {
    email: String!
    name: String!
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
