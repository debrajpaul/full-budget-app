export const forecastTypeDefs = /* GraphQL */ `
  type ForecastDay {
    date: String!
    inflow: Float!
    outflow: Float!
    net: Float!
    runningBalance: Float
  }

  enum AlertSeverity {
    info
    warning
    critical
  }

  type ForecastAlert {
    date: String!
    type: String!
    message: String!
    severity: AlertSeverity!
  }

  type ForecastResult {
    month: Int!
    year: Int!
    startingBalance: Float!
    endingBalance: Float!
    days: [ForecastDay!]!
    alerts: [ForecastAlert!]!
  }

  input ForecastOptionsInput {
    startingBalance: Float
    lowBalanceThreshold: Float
    largeExpenseThreshold: Float
  }

  type Query {
    """
    Forecasts daily cash flow for the specified month with optional rules.
    """
    forecastMonth(
      year: Int!
      month: Int!
      options: ForecastOptionsInput
    ): ForecastResult!
  }
`;
