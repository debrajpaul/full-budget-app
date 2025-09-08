export const authTypeDefs = /* GraphQL */ `
  type Query {
    """
    API version of the GraphQL service.
    """
    apiVersion: String
    """
    Simple health check; returns a status string if the API is up.
    """
    healthCheck: String
  }

  input RegisterInput {
    email: String!
    name: String!
    tenantId: TenantType!
    password: String!
  }

  type RegisterResponse {
    success: Boolean!
    message: String!
  }

  input LoginInput {
    email: String!
    tenantId: TenantType!
    password: String!
  }

  type User {
    email: String!
    name: String!
    tenantId: TenantType!
    isActive: Boolean!
  }

  type LoginResponse {
    user: User!
    token: String!
  }

  type Mutation {
    """
    Creates a new user account for the given tenant.
    """
    register(input: RegisterInput!): RegisterResponse!
    """
    Authenticates a user and returns a login token.
    """
    login(input: LoginInput!): LoginResponse!
  }
`;
