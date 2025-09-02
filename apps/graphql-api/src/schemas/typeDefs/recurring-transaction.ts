export const recurringTransactionTypeDefs = /* GraphQL */ `
  enum RecurringFrequency {
    monthly
    weekly
    biweekly
    yearly
  }

  type RecurringTransaction {
    id: String!
    description: String!
    amount: Float!
    category: String
    frequency: RecurringFrequency!
    dayOfMonth: Int
    dayOfWeek: Int
    monthOfYear: Int
    startDate: String!
    endDate: String
    nextRunDate: String
  }

  input CreateRecurringTransactionInput {
    description: String!
    amount: Float!
    category: String
    frequency: RecurringFrequency!
    dayOfMonth: Int
    dayOfWeek: Int
    monthOfYear: Int
    startDate: String!
    endDate: String
  }

  extend type Query {
    recurringTransactions: [RecurringTransaction!]!
  }

  extend type Mutation {
    createRecurringTransaction(
      input: CreateRecurringTransactionInput!
    ): RecurringTransaction!
    generateRecurringTransactions(month: Int!, year: Int!): Int!
  }
`;
