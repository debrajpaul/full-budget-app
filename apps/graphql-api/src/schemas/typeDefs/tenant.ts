export const tenantTypeDefs = /* GraphQL */ `
  type Tenant {
    id: TenantType!
    name: String!
  }

  type Query {
    tenants: [Tenant!]!
  }
`;
