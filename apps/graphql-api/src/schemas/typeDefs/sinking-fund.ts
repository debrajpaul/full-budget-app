export const sinkingFundTypeDefs = /* GraphQL */ `
  type SinkingFundHistoryPoint {
    date: String!
    value: Float!
  }

  type SinkingFund {
    id: ID!
    name: String!
    target: Float!
    current: Float!
    monthlyContribution: Float
    deadline: String
    history: [SinkingFundHistoryPoint!]!
  }

  type Query {
    """
    Lists sinking funds, balances, and history for the tenant.
    """
    sinkingFunds: [SinkingFund!]!
  }
`;
