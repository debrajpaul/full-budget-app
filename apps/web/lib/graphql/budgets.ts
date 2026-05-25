import { graphql } from "@api-client";

export const BudgetsDocument = graphql(`
  query Budgets($period: PeriodInput!) {
    budgets(period: $period) {
      id
      month
      year
      category
      amount
    }
  }
`);

export const MonthlyReviewForBudgetsDocument = graphql(`
  query MonthlyReviewForBudgets($month: Int!, $year: Int!) {
    monthlyReview(month: $month, year: $year) {
      categoryBreakdown {
        name
        amount
      }
    }
  }
`);

export const SetBudgetDocument = graphql(`
  mutation SetBudget(
    $period: PeriodInput!
    $category: String!
    $amount: Float!
  ) {
    setBudget(period: $period, category: $category, amount: $amount) {
      id
      month
      year
      category
      amount
    }
  }
`);
