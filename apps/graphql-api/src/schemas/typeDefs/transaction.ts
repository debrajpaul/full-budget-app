export const transactionTypeDefs = /* GraphQL */ `
  """
  Normalized bank transaction record as imported and processed.
  """
  type Transaction {
    tenantId: TenantType!
    userId: String!
    transactionId: String!
    bankName: BankName!
    credit: Float!
    debit: Float!
    balance: Float
    txnDate: String!
    description: String
    category: String
    subCategory: String
    taggedBy: String
    confidence: Float
  }

  """
  Cursor-paginated list of transaction items.
  """
  type TransactionsPage {
    items: [Transaction!]!
    cursor: String
  }

  """
  Subset of fields returned after reclassifying a transaction.
  """
  type ReclassifiedTransaction {
    id: String!
    category: String!
    taggedBy: String
  }

  """
  Filters to list transactions for a given period and category.
  """
  input TransactionsFilter {
    year: Int!
    month: Int!
    bankName: BankName
    category: String
  }

  """
  Category with its aggregated amount.
  """
  type CategoryAmount {
    name: String!
    amount: Float!
  }

  """
  Budget vs actual values for a specific date.
  """
  type ReviewSeriesPoint {
    date: String!
    budget: Float!
    actual: Float!
  }
  """
  Monthly aggregates, category breakdown, and time series.
  """
  type MonthlyReview {
    totalIncome: Float!
    totalExpenses: Float!
    savings: Float!
    categoryBreakdown: [CategoryAmount!]!
    series: [ReviewSeriesPoint!]!
  }

  """
  Yearly aggregates and the list of transactions.
  """
  type AnnualReview {
    totalIncome: Float!
    totalExpense: Float!
    netSavings: Float!
    transactions: [Transaction!]!
  }

  """
  Transactions grouped by category with total amount.
  """
  type CategoryGroup {
    category: String!
    totalAmount: Float!
    transactions: [Transaction!]!
  }

  """
  Top-level budget category buckets used for grouping.
  """
  enum BaseCategory {
    SAVINGS
    EXPENSES
    INCOME
    DEFAULT
  }

  """
  Categories grouped by their base category bucket.
  """
  type CategoriesByBase {
    base: BaseCategory!
    categories: [String!]!
  }

  """
  Aggregated totals for income, expenses, and net savings.
  """
  type AggregatedSummary {
    totalIncome: Float!
    totalExpense: Float!
    netSavings: Float!
  }

  """
  Root query operations for the Finance Budget API.
  """
  type Query {
    """
    Returns yearly income, expenses, net savings, and transactions.
    """
    annualReview(year: Int!): AnnualReview!
    """
    Returns monthly income, expenses, savings, category breakdown, and series.
    """
    monthlyReview(month: Int!, year: Int!): MonthlyReview!
    """
    Returns income, expense, and net savings for the given period.
    """
    aggregateSummary(year: Int!, month: Int): AggregatedSummary!
    """
    Groups transactions by category with totals for the month.
    """
    categoryBreakdown(month: Int!, year: Int!): [CategoryGroup!]!
    """
    Lists transactions filtered by month/year (paged by cursor).
    """
    transactions(
      filters: TransactionsFilter!
      cursor: String
    ): TransactionsPage!
    """
    Lists categories grouped by base type (INCOME/EXPENSES/SAVINGS).
    """
    categoriesByBase: [CategoriesByBase!]!
  }

  """
  Root mutation operations for the Finance Budget API.
  """
  type Mutation {
    """
    Adds or syncs transaction category rules for the current tenant.
    """
    addTransactionCategory: Boolean!
    """
    Reclassifies a transaction to a new category and returns the updated item.
    """
    reclassifyTransaction(
      id: String!
      category: String!
    ): ReclassifiedTransaction!
  }
`;
