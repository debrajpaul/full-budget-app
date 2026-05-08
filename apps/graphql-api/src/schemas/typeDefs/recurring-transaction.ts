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
  Whether a recurring transaction represents an inflow or outflow.
  """
  enum TransactionType {
    INCOME
    EXPENSE
  }

  """
  Definition and schedule of a recurring transaction.
  """
  type RecurringTransaction {
    id: String!
    description: String!
    amount: Float!
    category: String
    type: TransactionType!
    frequency: RecurringFrequency!
    dayOfMonth: Int
    dayOfWeek: Int
    monthOfYear: Int
    startDate: Date!
    endDate: Date
    nextRunDate: Date
  }

  """
  Input to create a recurring transaction rule.
  """
  input CreateRecurringTransactionInput {
    description: String!
    amount: Float!
    category: String
    type: TransactionType
    frequency: RecurringFrequency!
    dayOfMonth: Int
    dayOfWeek: Int
    monthOfYear: Int
    startDate: Date!
    endDate: Date
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
