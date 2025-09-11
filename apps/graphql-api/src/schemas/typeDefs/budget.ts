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

  extend type Mutation {
    """
    Sets the budget amount for a category in the specified month/year.
    """
    setBudget(period: PeriodInput!, category: String!, amount: Float!): Budget!
  }
`;
