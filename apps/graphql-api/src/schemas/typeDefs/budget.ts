export const budgetTypeDefs = /* GraphQL */ `
  """
  Budget allocation for a category in a specific month/year.
  """
  type Budget {
    id: String!
    month: Int!
    year: Int!
    category: String!
    amount: Float!
  }

  """
  Period identifier consisting of month and year.
  """
  input PeriodInput {
    month: Int!
    year: Int!
  }

  """
  Spend segments used by budget rules such as 50/30/20.
  """
  enum SpendSegment {
    NEEDS
    WANTS
    SAVINGS
  }

  """
  Where a segment sits relative to its target share of income.
  """
  enum SegmentStatus {
    ABOVE_TARGET
    ON_TARGET
    BELOW_TARGET
  }

  """
  Target share of income per segment, in percent. The three values must sum to 100.
  """
  input BudgetRuleInput {
    needs: Float!
    wants: Float!
    savings: Float!
  }

  """
  Actual spend for one segment compared with its target.
  """
  type SegmentSummary {
    segment: SpendSegment!
    actual: Float!
    percentOfIncome: Float!
    targetPercent: Float!
    targetAmount: Float!
    variance: Float!
    status: SegmentStatus!
  }

  """
  Monthly spend split into needs, wants and savings against a budget rule.
  """
  type BudgetSegmentation {
    month: Int!
    year: Int!
    totalIncome: Float!
    segments: [SegmentSummary!]!
    unsegmentedExpenses: Float!
    unclassified: Float!
  }

  extend type Query {
    """
    Lists all budgets for the authenticated user for the given period.
    """
    budgets(period: PeriodInput!): [Budget!]!
    """
    Splits the month's spend into needs, wants and savings and compares it with a
    budget rule. Defaults to 50/30/20 when no rule is given.
    """
    budgetSegmentation(
      period: PeriodInput!
      rule: BudgetRuleInput
    ): BudgetSegmentation!
  }

  extend type Mutation {
    """
    Sets the budget amount for a category in the specified month/year.
    """
    setBudget(period: PeriodInput!, category: String!, amount: Float!): Budget!
    """
    Deletes a budget entry by its id. Returns true on success.
    """
    deleteBudget(id: String!): Boolean!
  }
`;
