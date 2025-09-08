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
  type TransactionItem {
    id: String!
    date: String!
    description: String
    amount: Float!
    currency: String!
    category: String
    taggedBy: String
  }

  type TransactionsPage {
    items: [TransactionItem!]!
    cursor: String
  }

  type ReclassifiedTransaction {
    id: String!
    category: String!
    taggedBy: String
  }

  input TransactionsFilter {
    year: Int!
    month: Int!
    bankName: BankName
    category: String
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

  enum BaseCategory {
    SAVINGS
    EXPENSES
    INCOME
    DEFAULT
  }

  type CategoriesByBase {
    base: BaseCategory!
    categories: [String!]!
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
    transactions(
      filters: TransactionsFilter!
      cursor: String
    ): TransactionsPage!
    categoriesByBase: [CategoriesByBase!]!
  }

  type Mutation {
    addTransactionCategory: Boolean!
    reclassifyTransaction(
      id: String!
      category: String!
    ): ReclassifiedTransaction!
  }
`;
