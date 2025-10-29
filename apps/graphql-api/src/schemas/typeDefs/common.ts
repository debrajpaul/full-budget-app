export const commonTypeDefs = /* GraphQL */ `
  """
  Supported banks for statement import and transaction parsing.
  """
  enum BankName {
    HDFC
    SBI
    # ICICI
    AXIS
    # BOI
    # KOTAK
    # IDBI
    # UBI
    # YES
    # CANARA
    OTHER
  }
  """
  Supported banks type for statement import and transaction parsing.
  """
  enum BankType {
    SAVINGS
    CURRENT
    CREDIT_CARD
    OTHER
  }
  """
  Tenant scope used for data segregation across users/clients.
  """
  enum TenantType {
    PERSONAL
    CLIENT
    # GOVERNMENT
    # NGO
    # EDUCATIONAL
    DEFAULT
  }
`;
