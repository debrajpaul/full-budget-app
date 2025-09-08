export const sinkingFundTypeDefs = /* GraphQL */ `
  """Historical point representing sinking fund value on a date."""
  type SinkingFundHistoryPoint {
    date: String!
    value: Float!
  }

  """Sinking fund with targets, balances, and contribution history."""
  type SinkingFund {
    id: ID!
    name: String!
    target: Float!
    current: Float!
    monthlyContribution: Float
    deadline: String
    history: [SinkingFundHistoryPoint!]!
  }

  """Root query operations for the Finance Budget API."""
  type Query {
    """
    Lists sinking funds, balances, and history for the tenant.
    """
    sinkingFunds: [SinkingFund!]!
  }
`;
