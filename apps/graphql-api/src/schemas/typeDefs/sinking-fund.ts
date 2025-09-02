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
    sinkingFunds: [SinkingFund!]!
  }
`;
