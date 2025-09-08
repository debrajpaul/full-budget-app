export const commonTypeDefs = /* GraphQL */ `
  """Supported banks for statement import and transaction parsing."""
  enum BankName {
    HDFC
    SBI
    # ICICI
    # AXIS
    # BOI
    # KOTAK
    # IDBI
    # UBI
    # YES
    # CANARA
    OTHER
  }
  """Tenant scope used for data segregation across users/clients."""
  enum TenantType {
    PERSONAL
    CLIENT
    # GOVERNMENT
    # NGO
    # EDUCATIONAL
    DEFAULT
  }
`;
