"use client";
import { useState } from "react";
import { useMutation } from "@apollo/client";
import { toast } from "sonner";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { formatCurrency, formatDate } from "@/lib/utils";
import { ReclassifyDocument } from "@/lib/graphql/transactions";
import type { TransactionsQuery } from "@api-client";

type TxnItem = TransactionsQuery["transactions"]["items"][number];

interface ReclassifyDrawerProps {
  txn: TxnItem | null;
  allCategories: string[];
  open: boolean;
  onClose: () => void;
}

export function ReclassifyDrawer({
  txn,
  allCategories,
  open,
  onClose,
}: ReclassifyDrawerProps) {
  const [selected, setSelected] = useState<string>("");
  const [reclassify, { loading }] = useMutation(ReclassifyDocument, {
    optimisticResponse: txn
      ? {
          reclassifyTransaction: {
            __typename: "ReclassifiedTransaction" as const,
            id: txn.transactionId,
            category: selected,
            taggedBy: "USER",
          },
        }
      : undefined,
    update(cache, { data }) {
      if (!data?.reclassifyTransaction || !txn) return;
      cache.modify({
        id: cache.identify({
          __typename: "Transaction",
          transactionId: txn.transactionId,
        }),
        fields: {
          category: () => data.reclassifyTransaction.category,
          taggedBy: () => data.reclassifyTransaction.taggedBy ?? "USER",
        },
      });
    },
    onCompleted() {
      toast.success("Category updated");
      onClose();
    },
    onError(err) {
      toast.error(err.message.slice(0, 120));
    },
  });

  if (!txn) return null;

  const isCredit = txn.credit > 0;
  const amount = isCredit ? txn.credit : txn.debit;

  function handleSubmit() {
    if (!selected) return;
    reclassify({ variables: { id: txn!.transactionId, category: selected } });
  }

  return (
    <Sheet
      open={open}
      onOpenChange={(o) => {
        if (!o) onClose();
      }}
    >
      <SheetContent className="flex flex-col gap-4 sm:max-w-md">
        <SheetHeader>
          <SheetTitle className="truncate">
            {txn.description ?? "Transaction"}
          </SheetTitle>
          <SheetDescription>{formatDate(txn.txnDate)}</SheetDescription>
        </SheetHeader>

        <div className="grid grid-cols-2 gap-3 rounded-xl border p-3 text-sm">
          <div>
            <p className="text-xs text-muted-foreground">Bank</p>
            <p className="font-medium">{txn.bankName}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Amount</p>
            <p
              className={`font-medium tabular-nums ${isCredit ? "text-emerald-600" : ""}`}
            >
              {isCredit ? "+" : "−"}
              {formatCurrency(amount)}
            </p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Current category</p>
            {txn.category ? (
              <Badge variant="secondary" className="mt-0.5 font-normal">
                {txn.category}
              </Badge>
            ) : (
              <span className="text-xs text-muted-foreground">
                uncategorised
              </span>
            )}
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Tagged by</p>
            <p className="text-xs">{txn.taggedBy ?? "—"}</p>
          </div>
        </div>

        <Separator />

        <div className="flex flex-col gap-2">
          <p className="text-sm font-medium">Reclassify</p>
          <Select value={selected} onValueChange={setSelected}>
            <SelectTrigger>
              <SelectValue placeholder="Choose a category…" />
            </SelectTrigger>
            <SelectContent>
              {allCategories.map((c) => (
                <SelectItem key={c} value={c}>
                  {c}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button
            onClick={handleSubmit}
            disabled={!selected || loading}
            className="mt-1"
          >
            {loading ? "Saving…" : "Apply category"}
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
