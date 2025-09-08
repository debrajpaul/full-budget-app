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
    """Returns yearly income, expenses, net savings, and transactions."""
    annualReview(year: Int!): AnnualReview!
    """Returns monthly income, expenses, savings, category breakdown, and series."""
    monthlyReview(month: Int!, year: Int!): MonthlyReview!
    """Returns income, expense, and net savings for the given period."""
    aggregateSummary(year: Int!, month: Int): AggregatedSummary!
    """Groups transactions by category with totals for the month."""
    categoryBreakdown(month: Int!, year: Int!): [CategoryGroup!]!
    """Lists transactions filtered by month/year (paged by cursor)."""
    transactions(
      filters: TransactionsFilter!
      cursor: String
    ): TransactionsPage!
    """Lists categories grouped by base type (INCOME/EXPENSES/SAVINGS)."""
    categoriesByBase: [CategoriesByBase!]!
  }

  type Mutation {
    """Adds or syncs transaction category rules for the current tenant."""
    addTransactionCategory: Boolean!
    """Reclassifies a transaction to a new category and returns the updated item."""
    reclassifyTransaction(
      id: String!
      category: String!
    ): ReclassifiedTransaction!
  }
`;
