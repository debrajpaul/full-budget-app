export const sinkingFundTypeDefs = /* GraphQL */ `
  """
  Historical point representing sinking fund value on a date.
  """
  type SinkingFundHistoryPoint {
    date: Date!
    value: Float!
  }

  """
  Sinking fund with targets, balances, and contribution history.
  """
  type SinkingFund {
    id: ID!
    name: String!
    target: Float!
    current: Float!
    monthlyContribution: Float
    deadline: Date
    history: [SinkingFundHistoryPoint!]!
  }

  """
  Input to create a new sinking fund.
  """
  input CreateSinkingFundInput {
    name: String!
    target: Float!
    monthlyContribution: Float
    deadline: Date
  }

  """
  Input to update sinking fund metadata (PATCH semantics — omitted fields unchanged).
  """
  input UpdateSinkingFundInput {
    name: String
    target: Float
    monthlyContribution: Float
    deadline: Date
  }

  """
  Input to record a contribution to a sinking fund.
  """
  input ContributeSinkingFundInput {
    id: ID!
    amount: Float!
  }

  """
  Root query operations for the Finance Budget API.
  """
  type Query {
    """
    Lists sinking funds, balances, and history for the tenant.
    """
    sinkingFunds: [SinkingFund!]!
  }

  """
  Root mutation operations for the Finance Budget API.
  """
  type Mutation {
    """
    Creates a new sinking fund and seeds an initial history point with value 0.
    """
    createSinkingFund(input: CreateSinkingFundInput!): SinkingFund!
    """
    Updates sinking fund metadata using PATCH semantics (only provided fields change).
    """
    updateSinkingFund(id: ID!, input: UpdateSinkingFundInput!): SinkingFund!
    """
    Records a contribution to a sinking fund, updating current and appending history.
    """
    contributeSinkingFund(input: ContributeSinkingFundInput!): SinkingFund!
    """
    Deletes a sinking fund by id. Returns true on success.
    """
    deleteSinkingFund(id: ID!): Boolean!
  }
`;
