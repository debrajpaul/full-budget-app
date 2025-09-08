export const uploadStatementTypeDefs = /* GraphQL */ `
  input StatementInput {
    bankName: BankName!
    fileName: String!
    contentBase64: String!
  }

  type Mutation {
    """Uploads a bank statement file (base64) for processing and import."""
    uploadStatement(input: StatementInput!): Boolean!
  }
`;
