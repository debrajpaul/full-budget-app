export const uploadStatementTypeDefs = /* GraphQL */ `
  """
  Payload to upload a bank statement (base64 content).
  """
  input StatementInput {
    bankName: BankName!
    fileName: String!
    contentBase64: String!
  }

  """
  Root mutation operations for the Finance Budget API.
  """
  type Mutation {
    """
    Uploads a bank statement file (base64) for processing and import.
    """
    uploadStatement(input: StatementInput!): Boolean!
  }
`;
