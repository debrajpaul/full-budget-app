export const forecastTypeDefs = /* GraphQL */ `
  """
  Per-day forecast metrics and running balance.
  """
  type ForecastDay {
    date: Date!
    inflow: Float!
    outflow: Float!
    net: Float!
    runningBalance: Float
  }

  """
  Severity levels for forecast alerts.
  """
  enum AlertSeverity {
    info
    warning
    critical
  }

  """
  Classification of forecast alerts.
  """
  enum AlertType {
    LOW_BALANCE
    LARGE_EXPENSE
  }

  """
  Alert generated during forecasting with severity and message.
  """
  type ForecastAlert {
    date: Date!
    type: AlertType!
    message: String!
    severity: AlertSeverity!
  }

  """
  Monthly cash-flow forecast summary with daily details and alerts.
  """
  type ForecastResult {
    month: Int!
    year: Int!
    startingBalance: Float!
    endingBalance: Float!
    days: [ForecastDay!]!
    alerts: [ForecastAlert!]!
  }

  """
  Optional parameters to tune forecasting behavior and thresholds.
  """
  input ForecastOptionsInput {
    startingBalance: Float
    lowBalanceThreshold: Float
    largeExpenseThreshold: Float
  }

  """
  Root query operations for the Finance Budget API.
  """
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
