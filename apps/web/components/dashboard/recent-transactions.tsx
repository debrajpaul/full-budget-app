import Link from "next/link";
import { ArrowRight } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn, formatCurrency, formatDate } from "@/lib/utils";

interface TxnRow {
  id: string;
  date: string;
  description?: string | null;
  credit: number;
  debit: number;
  currency: string;
  category?: string | null;
  taggedBy?: string | null;
}

interface RecentTransactionsProps {
  items: TxnRow[];
  limit?: number;
}

export function RecentTransactions({
  items,
  limit = 8,
}: RecentTransactionsProps) {
  const rows = items.slice(0, limit);

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between gap-2">
        <div>
          <CardTitle className="text-base">Recent transactions</CardTitle>
          <CardDescription>Latest activity this month</CardDescription>
        </div>
        <Button asChild variant="ghost" size="sm">
          <Link href="/transactions">
            View all <ArrowRight className="ml-1 h-4 w-4" />
          </Link>
        </Button>
      </CardHeader>
      <CardContent>
        {rows.length === 0 ? (
          <EmptyState />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-xs uppercase text-muted-foreground">
                <tr className="border-b">
                  <th className="px-2 py-2 text-left font-medium">Date</th>
                  <th className="px-2 py-2 text-left font-medium">
                    Description
                  </th>
                  <th className="px-2 py-2 text-left font-medium">Category</th>
                  <th className="px-2 py-2 text-right font-medium">Amount</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((t) => {
                  const isCredit = t.credit > 0;
                  const amount = isCredit ? t.credit : t.debit;
                  return (
                    <tr key={t.id} className="border-b last:border-b-0">
                      <td className="px-2 py-2 whitespace-nowrap text-muted-foreground">
                        {formatDate(t.date)}
                      </td>
                      <td className="max-w-[18rem] truncate px-2 py-2">
                        {t.description ?? "—"}
                      </td>
                      <td className="px-2 py-2">
                        {t.category ? (
                          <Badge variant="secondary" className="font-normal">
                            {t.category}
                          </Badge>
                        ) : (
                          <span className="text-xs text-muted-foreground">
                            uncategorised
                          </span>
                        )}
                      </td>
                      <td
                        className={cn(
                          "px-2 py-2 text-right tabular-nums",
                          isCredit ? "text-emerald-600" : "text-foreground"
                        )}
                      >
                        {isCredit ? "+" : "−"}
                        {formatCurrency(amount)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function EmptyState() {
  return (
    <div className="py-12 text-center text-sm text-muted-foreground">
      No transactions yet this month.
      <div className="mt-2 text-xs">
        Try{" "}
        <Link href="/upload" className="underline underline-offset-2">
          uploading a statement
        </Link>{" "}
        or run{" "}
        <code className="rounded bg-muted px-1 py-0.5">pnpm seed:aws</code>.
      </div>
    </div>
  );
}
