import { getClient } from "@/lib/apollo/server-client";
import { formatMonthYear, parseMonthYearParams } from "@/lib/utils";
import {
  BudgetsDocument,
  MonthlyReviewForBudgetsDocument,
} from "@/lib/graphql/budgets";
import { BudgetsView } from "@/components/budgets/budgets-view";
import { MonthPicker } from "@/components/dashboard/month-picker";

export const dynamic = "force-dynamic";

export const metadata = { title: "Budgets · full-budget" };

interface PageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

export default async function BudgetsPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const period = parseMonthYearParams(params);

  const client = await getClient();

  const [budgetsResult, reviewResult] = await Promise.allSettled([
    client.query({
      query: BudgetsDocument,
      variables: { period: { month: period.month, year: period.year } },
      fetchPolicy: "no-cache",
    }),
    client.query({
      query: MonthlyReviewForBudgetsDocument,
      variables: { month: period.month, year: period.year },
      fetchPolicy: "no-cache",
    }),
  ]);

  const initialBudgets =
    budgetsResult.status === "fulfilled"
      ? (budgetsResult.value.data?.budgets ?? [])
      : [];

  const categoryBreakdown =
    reviewResult.status === "fulfilled"
      ? (reviewResult.value.data?.monthlyReview.categoryBreakdown ?? [])
      : [];

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Budgets</h1>
          <p className="text-sm text-muted-foreground">
            {formatMonthYear(period.month, period.year)}
          </p>
        </div>
        <MonthPicker current={period} basePath="/budgets" />
      </div>

      <BudgetsView
        initialBudgets={initialBudgets}
        categoryBreakdown={categoryBreakdown}
        period={period}
      />
    </div>
  );
}
