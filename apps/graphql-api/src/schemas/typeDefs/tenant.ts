export const tenantTypeDefs = /* GraphQL */ `
  """Tenant record available in the system."""
  type Tenant {
    id: TenantType!
    name: String!
  }

  """Root query operations for the Finance Budget API."""
  type Query {
    """
    Lists supported tenant types available in the system.
    """
    tenants: [Tenant!]!
  }
`;
