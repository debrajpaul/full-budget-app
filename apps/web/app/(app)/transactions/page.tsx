import { Suspense } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { getClient } from "@/lib/apollo/server-client";
import { parseMonthYearParams } from "@/lib/utils";
import {
  TransactionsDocument,
  CategoriesByBaseDocument,
} from "@/lib/graphql/transactions";
import { TransactionsView } from "@/components/transactions/transactions-view";

export const dynamic = "force-dynamic";

export const metadata = { title: "Transactions · full-budget" };

interface PageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

export default async function TransactionsPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const period = parseMonthYearParams(params);

  const bankParam = Array.isArray(params.bank) ? params.bank[0] : params.bank;
  const categoryParam = Array.isArray(params.category)
    ? params.category[0]
    : params.category;

  // Both queries run in parallel server-side
  const [txnResult, catResult] = await Promise.allSettled([
    (await getClient()).query({
      query: TransactionsDocument,
      variables: {
        filters: {
          year: period.year,
          month: period.month,
          ...(bankParam ? { bankName: bankParam as never } : {}),
          ...(categoryParam ? { category: categoryParam } : {}),
        },
      },
      fetchPolicy: "no-cache",
    }),
    (await getClient()).query({
      query: CategoriesByBaseDocument,
      fetchPolicy: "cache-first",
    }),
  ]);

  const initialItems =
    txnResult.status === "fulfilled"
      ? (txnResult.value.data?.transactions?.items ?? [])
      : [];
  const initialCursor =
    txnResult.status === "fulfilled"
      ? (txnResult.value.data?.transactions?.cursor ?? null)
      : null;
  const categoriesByBase =
    catResult.status === "fulfilled"
      ? (catResult.value.data?.categoriesByBase ?? [])
      : [];

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Transactions</h1>
        <p className="text-sm text-muted-foreground">
          Browse and reclassify your imported transactions.
        </p>
      </div>

      <Suspense fallback={<TransactionsSkeleton />}>
        <TransactionsView
          initialItems={initialItems}
          initialCursor={initialCursor}
          categoriesByBase={categoriesByBase}
          period={period}
          bankFilter={bankParam}
          categoryFilter={categoryParam}
        />
      </Suspense>
    </div>
  );
}

function TransactionsSkeleton() {
  return (
    <div className="space-y-2">
      <Skeleton className="h-10 w-full rounded-lg" />
      {Array.from({ length: 8 }).map((_, i) => (
        <Skeleton key={i} className="h-12 w-full rounded-md" />
      ))}
    </div>
  );
}
