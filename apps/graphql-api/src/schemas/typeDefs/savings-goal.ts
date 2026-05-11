export const savingsGoalTypeDefs = /* GraphQL */ `
  """
  Historical point representing savings value on a date.
  """
  type SavingsHistoryPoint {
    date: Date!
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
    deadline: Date!
    history: [SavingsHistoryPoint!]!
  }

  """
  Input to create a new savings goal.
  """
  input CreateSavingsGoalInput {
    name: String!
    target: Float!
    deadline: Date!
    initialAmount: Float
  }

  """
  Input to update an existing savings goal (PATCH semantics – all fields optional).
  """
  input UpdateSavingsGoalInput {
    name: String
    target: Float
    deadline: Date
  }

  """
  Input to contribute an amount toward a savings goal.
  """
  input ContributeSavingsGoalInput {
    id: ID!
    amount: Float!
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

  """
  Root mutation operations for the Finance Budget API.
  """
  type Mutation {
    """
    Creates a new savings goal and seeds an initial history point.
    """
    createSavingsGoal(input: CreateSavingsGoalInput!): SavingsGoal!
    """
    Updates an existing savings goal using PATCH semantics (only provided fields change).
    """
    updateSavingsGoal(id: ID!, input: UpdateSavingsGoalInput!): SavingsGoal!
    """
    Deletes a savings goal by id. Returns true on success.
    """
    deleteSavingsGoal(id: ID!): Boolean!
    """
    Adds a contribution to a savings goal, appending a history point.
    """
    contributeSavingsGoal(input: ContributeSavingsGoalInput!): SavingsGoal!
  }
`;
