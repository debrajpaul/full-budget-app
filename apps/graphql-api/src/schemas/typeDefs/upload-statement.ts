export const uploadStatementTypeDefs = /* GraphQL */ `
  input StatementInput {
    bank: BankName!
    fileName: String!
    contentBase64: String!
  }

  type Mutation {
    uploadStatement(input: StatementInput!): Boolean!
  }
`;
