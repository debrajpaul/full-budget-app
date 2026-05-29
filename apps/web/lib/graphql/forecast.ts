import { graphql } from "@api-client";

export const ForecastMonthDocument = graphql(`
  query ForecastMonth(
    $year: Int!
    $month: Int!
    $options: ForecastOptionsInput
  ) {
    forecastMonth(year: $year, month: $month, options: $options) {
      month
      year
      startingBalance
      endingBalance
      days {
        date
        inflow
        outflow
        net
        runningBalance
      }
      alerts {
        date
        type
        message
        severity
      }
    }
  }
`);
