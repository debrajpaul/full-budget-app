export const budgetTypeDefs = /* GraphQL */ `
  """
  Budget allocation for a category in a specific month/year.
  """
  type Budget {
    id: String!
    month: Int!
    year: Int!
    category: String!
    amount: Float!
  }

  """
  Period identifier consisting of month and year.
  """
  input PeriodInput {
    month: Int!
    year: Int!
  }

  extend type Query {
    """
    Lists all budgets for the authenticated user for the given period.
    """
    budgets(period: PeriodInput!): [Budget!]!
  }

  extend type Mutation {
    """
    Sets the budget amount for a category in the specified month/year.
    """
    setBudget(period: PeriodInput!, category: String!, amount: Float!): Budget!
    """
    Deletes a budget entry by its id. Returns true on success.
    """
    deleteBudget(id: String!): Boolean!
  }
`;
