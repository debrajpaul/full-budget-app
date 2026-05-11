export const authTypeDefs = /* GraphQL */ `
  """
  Root query operations for the Finance Budget API.
  """
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

  """
  Input payload to register a new user account.
  """
  input RegisterInput {
    email: String!
    name: String!
    tenantId: TenantType!
    password: String!
  }

  """
  Result of the register mutation.
  """
  type RegisterResponse {
    success: Boolean!
    message: String!
  }

  """
  Input payload to authenticate a user.
  """
  input LoginInput {
    email: String!
    tenantId: TenantType!
    password: String!
  }

  """
  User account profile for the authenticated tenant.
  """
  type User {
    email: String!
    name: String!
    tenantId: TenantType!
    isActive: Boolean!
  }

  """
  Result of the login mutation containing user, access token, and a single-use refresh token.
  """
  type LoginResponse {
    user: User!
    token: String!
    refreshToken: String!
  }

  """
  Root mutation operations for the Finance Budget API.
  """
  type Mutation {
    """
    Creates a new user account for the given tenant.
    """
    register(input: RegisterInput!): RegisterResponse!
    """
    Authenticates a user and returns an access token and a single-use refresh token.
    """
    login(input: LoginInput!): LoginResponse!
    """
    Issues a new LoginResponse using a valid refresh token (single-use rotation).
    Revokes the supplied token; replaying a used token revokes the entire family.
    """
    refreshToken(refreshToken: String!): LoginResponse!
  }
`;
