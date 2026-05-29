/**
 * Dashboard GraphQL operations.
 *
 * Co-located with the feature they power. Codegen picks them up via the
 * `apps/web/lib/graphql/**\/*.{ts,tsx}` glob in packages/api-client/codegen.ts,
 * making `graphql(...)` calls fully typed after `pnpm codegen`.
 */
import { graphql } from "@api-client";

export const DashboardMonthlyReviewDocument = graphql(`
  query DashboardMonthlyReview($month: Int!, $year: Int!) {
    monthlyReview(month: $month, year: $year) {
      totalIncome
      totalExpenses
      savings
      categoryBreakdown {
        name
        amount
      }
      series {
        date
        budget
        actual
      }
    }
  }
`);

export const DashboardRecentTransactionsDocument = graphql(`
  query DashboardRecentTransactions(
    $filters: TransactionsFilter!
    $cursor: String
  ) {
    transactions(filters: $filters, cursor: $cursor) {
      items {
        transactionId
        txnDate
        description
        credit
        debit
        category
        taggedBy
      }
      cursor
    }
  }
`);
