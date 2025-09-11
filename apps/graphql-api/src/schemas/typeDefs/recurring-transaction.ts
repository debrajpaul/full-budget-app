export const recurringTransactionTypeDefs = /* GraphQL */ `
  """
  Supported schedules for recurring transactions.
  """
  enum RecurringFrequency {
    monthly
    weekly
    biweekly
    yearly
  }

  """
  Definition and schedule of a recurring transaction.
  """
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

  """
  Input to create a recurring transaction rule.
  """
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
    """
    Lists all recurring transactions for the current tenant/user.
    """
    recurringTransactions: [RecurringTransaction!]!
  }

  extend type Mutation {
    """
    Creates a recurring transaction definition.
    """
    createRecurringTransaction(
      input: CreateRecurringTransactionInput!
    ): RecurringTransaction!
    """
    Materializes recurring transactions for the given month and returns the count.
    """
    generateRecurringTransactions(month: Int!, year: Int!): Int!
  }
`;
