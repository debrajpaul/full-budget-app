export const savingsGoalTypeDefs = /* GraphQL */ `
  type SavingsHistoryPoint {
    date: String!
    value: Float!
  }

  type SavingsGoal {
    id: ID!
    name: String!
    target: Float!
    current: Float!
    deadline: String!
    history: [SavingsHistoryPoint!]!
  }

  type Query {
    """
    Lists savings goals with current progress and history.
    """
    savingsGoals: [SavingsGoal!]!
  }
`;
