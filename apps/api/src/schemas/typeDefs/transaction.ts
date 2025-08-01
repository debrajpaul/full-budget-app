export const transactionTypeDefs = /* GraphQL */ `
  type Transaction {
    userId: String!
    transactionId: String!
    bankName: BankName!
    amount: Float!
    balance: Float
    txnDate: String!
    description: String
    category: String
    type: String
  }

  type MonthlyReview {
    totalIncome: Float!
    totalExpense: Float!
    netSavings: Float!
    transactions: [Transaction!]!
  }

  type AnnualReview {
    totalIncome: Float!
    totalExpense: Float!
    netSavings: Float!
    transactions: [Transaction!]!
  }

  type Query {
    monthlyReview(month: Int!, year: Int!): MonthlyReview!
    annualReview(year: Int!): AnnualReview!
  }
`;
