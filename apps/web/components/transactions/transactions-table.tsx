"use client";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { cn, formatCurrency, formatDate } from "@/lib/utils";
import type { TransactionsQuery } from "@api-client";

type TxnItem = TransactionsQuery["transactions"]["items"][number];

interface TransactionsTableProps {
  items: TxnItem[];
  onRowClick: (txn: TxnItem) => void;
}

const BANK_LABELS: Record<string, string> = {
  HDFC: "HDFC",
  SBI: "SBI",
  AXIS: "Axis",
  OTHER: "Other",
};

export function TransactionsTable({ items, onRowClick }: TransactionsTableProps) {
  if (items.length === 0) {
    return (
      <div className="rounded-xl border py-16 text-center text-sm text-muted-foreground">
        No transactions found for the selected filters.
      </div>
    );
  }

  return (
    <div className="rounded-xl border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-28">Date</TableHead>
            <TableHead>Description</TableHead>
            <TableHead className="w-20">Bank</TableHead>
            <TableHead className="w-28 text-right">Credit</TableHead>
            <TableHead className="w-28 text-right">Debit</TableHead>
            <TableHead className="w-40">Category</TableHead>
            <TableHead className="w-28">Tagged by</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {items.map((txn) => (
            <TableRow
              key={txn.transactionId}
              className="cursor-pointer hover:bg-muted/50"
              onClick={() => onRowClick(txn)}
            >
              <TableCell className="whitespace-nowrap text-muted-foreground">
                {formatDate(txn.txnDate)}
              </TableCell>
              <TableCell className="max-w-[20rem] truncate">
                {txn.description ?? "—"}
              </TableCell>
              <TableCell className="text-xs text-muted-foreground">
                {BANK_LABELS[txn.bankName] ?? txn.bankName}
              </TableCell>
              <TableCell
                className={cn(
                  "text-right tabular-nums",
                  txn.credit > 0 ? "text-emerald-600" : "text-muted-foreground/40"
                )}
              >
                {txn.credit > 0 ? formatCurrency(txn.credit) : "—"}
              </TableCell>
              <TableCell className="text-right tabular-nums">
                {txn.debit > 0 ? formatCurrency(txn.debit) : "—"}
              </TableCell>
              <TableCell>
                {txn.category ? (
                  <Badge variant="secondary" className="font-normal">
                    {txn.category}
                  </Badge>
                ) : (
                  <span className="text-xs text-muted-foreground">
                    uncategorised
                  </span>
                )}
              </TableCell>
              <TableCell className="text-xs text-muted-foreground">
                {txn.taggedBy ?? "—"}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
