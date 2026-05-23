"use client";
import { useState } from "react";
import { useQuery } from "@apollo/client";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import type { MonthYear } from "@/lib/utils";
import { TransactionsDocument } from "@/lib/graphql/transactions";
import { TransactionFilters } from "./transaction-filters";
import { TransactionsTable } from "./transactions-table";
import { ReclassifyDrawer } from "./reclassify-drawer";
import type { TransactionsQuery } from "@api-client";

type TxnItem = TransactionsQuery["transactions"]["items"][number];

interface CategoriesByBaseItem {
  base: string;
  categories: string[];
}

interface TransactionsViewProps {
  initialItems:      TxnItem[];
  initialCursor:     string | null;
  categoriesByBase:  CategoriesByBaseItem[];
  period:            MonthYear;
  bankFilter?:       string;
  categoryFilter?:   string;
}

export function TransactionsView({
  initialItems,
  initialCursor,
  categoriesByBase,
  period,
  bankFilter,
  categoryFilter,
}: TransactionsViewProps) {
  const [drawerTxn, setDrawerTxn] = useState<TxnItem | null>(null);

  // Client-side query so fetchMore (load-more) works.
  // initialItems hydrate the cache via returnPartialData on first render.
  const { data, fetchMore, loading } = useQuery(TransactionsDocument, {
    variables: {
      filters: {
        year:     period.year,
        month:    period.month,
        ...(bankFilter     ? { bankName: bankFilter as never }    : {}),
        ...(categoryFilter ? { category: categoryFilter }         : {}),
      },
    },
    // ssr: false — page.tsx already ran this server-side; skip duplicate fetch.
    notifyOnNetworkStatusChange: true,
  });

  const items  = data?.transactions.items  ?? initialItems;
  const cursor = data?.transactions.cursor ?? initialCursor;

  const allCategories = categoriesByBase.flatMap((g) => g.categories).sort();

  function handleLoadMore() {
    if (!cursor) return;
    fetchMore({
      variables: { cursor },
      updateQuery(prev, { fetchMoreResult }) {
        if (!fetchMoreResult) return prev;
        return {
          transactions: {
            ...fetchMoreResult.transactions,
            items: [
              ...prev.transactions.items,
              ...fetchMoreResult.transactions.items,
            ],
          },
        };
      },
    });
  }

  return (
    <div className="flex flex-col gap-4">
      <TransactionFilters
        period={period}
        bankFilter={bankFilter}
        categoryFilter={categoryFilter}
        categoriesByBase={categoriesByBase}
      />

      {loading && items.length === 0 ? (
        <div className="space-y-2">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-12 w-full rounded-md" />
          ))}
        </div>
      ) : (
        <>
          <TransactionsTable
            items={items}
            onRowClick={(txn) => setDrawerTxn(txn)}
          />

          {cursor && (
            <div className="flex justify-center pt-2">
              <Button
                variant="outline"
                onClick={handleLoadMore}
                disabled={loading}
              >
                {loading ? "Loading…" : "Load more"}
              </Button>
            </div>
          )}

          <p className="text-center text-xs text-muted-foreground">
            {items.length} transaction{items.length !== 1 ? "s" : ""}
            {cursor ? " (scroll for more)" : ""}
          </p>
        </>
      )}

      <ReclassifyDrawer
        txn={drawerTxn}
        allCategories={allCategories}
        open={drawerTxn !== null}
        onClose={() => setDrawerTxn(null)}
      />
    </div>
  );
}
