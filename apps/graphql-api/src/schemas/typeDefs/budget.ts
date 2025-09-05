export const budgetTypeDefs = /* GraphQL */ `
  type Budget {
    id: String!
    month: Int!
    year: Int!
    category: String!
    amount: Float!
  }

  input PeriodInput {
    month: Int!
    year: Int!
  }

  extend type Mutation {
    setBudget(period: PeriodInput!, category: String!, amount: Float!): Budget!
  }
`;
