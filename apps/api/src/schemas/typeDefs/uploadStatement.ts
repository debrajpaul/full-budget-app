export const uploadStatementTypeDefs = /* GraphQL */ `
  type Mutation {
    uploadStatement(
      bank: BankName!
      fileName: String!
      contentBase64: String!
    ): Boolean!
  }
`;
