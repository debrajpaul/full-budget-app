export const budgetTypeDefs = /* GraphQL */ `
  scalar File

  type BudgetSyncSummary {
    created: Int!
    updated: Int!
    skipped: Int!
    total: Int!
  }

  input BudgetInput {
    title: String!
    duration: Int
    monthly: Float!
    annual: Float
    assign: Float
    flag: String
    source: String
    note: String
  }

  type BudgetItem {
    id: ID!
    title: String!
    duration: Int
    monthly: Float!
    annual: Float
    assign: Float
    flag: String
    source: String
    note: String
    createdAt: String
    updatedAt: String
  }

  type Query {
    getAllBudgets: [BudgetItem!]!
  }

  type Mutation {
    syncBudgetFromCsv(data: [BudgetInput!]!): BudgetSyncSummary!
    uploadBudgetCsv(file: File!): BudgetSyncSummary!
  }
`;
