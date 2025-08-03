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

  type CategoryGroup {
    category: String!
    totalAmount: Float!
    transactions: [Transaction!]!
  }

  type Query {
    annualReview(year: Int!): AnnualReview!
    monthlyReview(month: Int!, year: Int!): MonthlyReview!
    categoryBreakdown(month: Int!, year: Int!): [CategoryGroup!]!
  }
`;
