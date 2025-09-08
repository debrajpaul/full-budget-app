export const tenantTypeDefs = /* GraphQL */ `
  type Tenant {
    id: TenantType!
    name: String!
  }

  type Query {
    """Lists supported tenant types available in the system."""
    tenants: [Tenant!]!
  }
`;
