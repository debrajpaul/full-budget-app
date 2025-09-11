export const savingsGoalTypeDefs = /* GraphQL */ `
  """
  Historical point representing savings value on a date.
  """
  type SavingsHistoryPoint {
    date: String!
    value: Float!
  }

  """
  Savings goal with target, current progress, deadline, and history.
  """
  type SavingsGoal {
    id: ID!
    name: String!
    target: Float!
    current: Float!
    deadline: String!
    history: [SavingsHistoryPoint!]!
  }

  """
  Root query operations for the Finance Budget API.
  """
  type Query {
    """
    Lists savings goals with current progress and history.
    """
    savingsGoals: [SavingsGoal!]!
  }
`;
