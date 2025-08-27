export const transactionTypeDefs = /* GraphQL */ `
  type Transaction {
    tenantId: TenantType!
    userId: String!
    transactionId: String!
    bankName: BankName!
    amount: Float!
    balance: Float
    txnDate: String!
    description: String
    category: String
    embedding: [Float!]
    taggedBy: String
    confidence: Float
    type: String
  }
 type CategoryAmount {
    name: String!
    amount: Float!
  }

  type ReviewSeriesPoint {
    date: String!
    budget: Float!
    actual: Float!
  }
  type MonthlyReview {
    totalIncome: Float!
    totalExpenses: Float!
    savings: Float!
    categoryBreakdown: [CategoryAmount!]!
    series: [ReviewSeriesPoint!]!
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

  type AggregatedSummary {
    totalIncome: Float!
    totalExpense: Float!
    netSavings: Float!
  }

  type Query {
    annualReview(year: Int!): AnnualReview!
    monthlyReview(month: Int!, year: Int!): MonthlyReview!
    aggregateSummary(year: Int!, month: Int): AggregatedSummary!
    categoryBreakdown(month: Int!, year: Int!): [CategoryGroup!]!
    filteredTransactions(
      year: Int!
      month: Int!
      bankName: BankName
      category: String
    ): [Transaction!]!
    addTransactionCategory: Boolean!
  }
`;
