export const uploadStatementTypeDefs = /* GraphQL */ `
  input StatementInput {
    bankName: BankName!
    fileName: String!
    contentBase64: String!
  }

  type Mutation {
    uploadStatement(input: StatementInput!): Boolean!
  }
`;
