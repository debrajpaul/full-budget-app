import { Suspense } from "react";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { getClient } from "@/lib/apollo/server-client";
import { getSessionUser } from "@/lib/auth/session";
import {
  formatMonthYear,
  parseMonthYearParams,
  type MonthYear,
} from "@/lib/utils";
import {
  DashboardMonthlyReviewDocument,
  DashboardRecentTransactionsDocument,
} from "@/lib/graphql/dashboard";
import { KpiCards } from "@/components/dashboard/kpi-cards";
import { CategoryDonut } from "@/components/dashboard/category-donut";
import { BudgetActualChart } from "@/components/dashboard/budget-actual-chart";
import { RecentTransactions } from "@/components/dashboard/recent-transactions";
import { MonthPicker } from "@/components/dashboard/month-picker";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Dashboard · full-budget",
};

interface DashboardPageProps {
  // Next.js 15: searchParams is a Promise in async server components
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

export default async function DashboardPage({
  searchParams,
}: DashboardPageProps) {
  const user = await getSessionUser();
  const params = await searchParams;
  const period = parseMonthYearParams(params);

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-6">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-semibold tracking-tight">
              {formatMonthYear(period.month, period.year)}
            </h1>
            {user.tenantId && (
              <Badge variant="secondary" className="uppercase">
                {user.tenantId}
              </Badge>
            )}
          </div>
          {user.email && (
            <p className="text-sm text-muted-foreground">
              Signed in as <span className="font-mono">{user.email}</span>
            </p>
          )}
        </div>
        <MonthPicker current={period} />
      </div>

      {/* Streamed: monthly review (KPIs + charts) */}
      <Suspense
        key={`mr-${period.month}-${period.year}`}
        fallback={<MonthlyReviewSkeleton />}
      >
        <MonthlyReviewSection period={period} />
      </Suspense>

      {/* Streamed: recent transactions */}
      <Suspense
        key={`rt-${period.month}-${period.year}`}
        fallback={<RecentTransactionsSkeleton />}
      >
        <RecentTransactionsSection period={period} />
      </Suspense>
    </div>
  );
}

/* ─── Sections ────────────────────────────────────────────────────────── */

async function MonthlyReviewSection({ period }: { period: MonthYear }) {
  try {
    const client = await getClient();
    const { data } = await client.query({
      query: DashboardMonthlyReviewDocument,
      variables: { month: period.month, year: period.year },
      fetchPolicy: "no-cache",
    });

    const mr = data.monthlyReview;

    return (
      <>
        <KpiCards
          totalIncome={mr.totalIncome}
          totalExpenses={mr.totalExpenses}
          savings={mr.savings}
        />
        <div className="grid gap-4 lg:grid-cols-5">
          <div className="lg:col-span-3">
            <BudgetActualChart data={mr.series} />
          </div>
          <div className="lg:col-span-2">
            <CategoryDonut data={mr.categoryBreakdown} />
          </div>
        </div>
      </>
    );
  } catch (err) {
    return (
      <SectionError
        title="Couldn't load monthly review"
        detail={(err as Error).message}
      />
    );
  }
}

async function RecentTransactionsSection({ period }: { period: MonthYear }) {
  try {
    const client = await getClient();
    const { data } = await client.query({
      query: DashboardRecentTransactionsDocument,
      variables: {
        filters: { month: period.month, year: period.year },
      },
      fetchPolicy: "no-cache",
    });

    return <RecentTransactions items={data.transactions.items} />;
  } catch (err) {
    return (
      <SectionError
        title="Couldn't load recent transactions"
        detail={(err as Error).message}
      />
    );
  }
}

/* ─── Skeletons ───────────────────────────────────────────────────────── */

function MonthlyReviewSkeleton() {
  return (
    <>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {[1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-28 w-full rounded-xl" />
        ))}
      </div>
      <div className="grid gap-4 lg:grid-cols-5">
        <Skeleton className="h-80 w-full rounded-xl lg:col-span-3" />
        <Skeleton className="h-80 w-full rounded-xl lg:col-span-2" />
      </div>
    </>
  );
}

function RecentTransactionsSkeleton() {
  return <Skeleton className="h-64 w-full rounded-xl" />;
}

/* ─── Error UI ─────────────────────────────────────────────────────────── */

function SectionError({ title, detail }: { title: string; detail: string }) {
  return (
    <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-4 text-sm">
      <p className="font-medium text-destructive">{title}</p>
      <p className="mt-1 text-xs text-muted-foreground">
        {detail.slice(0, 240)}
      </p>
    </div>
  );
}
