export const uploadStatementTypeDefs = /* GraphQL */ `
  type Mutation {
    uploadStatement(bank: String!, fileName: String!, contentBase64: String!): Boolean!
  }
`;
