"use client";

import { useState } from "react";
import { useQuery, useMutation } from "@apollo/client";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { Plus } from "lucide-react";
import type { BudgetsQuery } from "@app/api-client";
import { formatCurrency } from "@/lib/utils";
import { cn } from "@/lib/utils";
import type { MonthYear } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { BudgetsDocument, SetBudgetDocument } from "@/lib/graphql/budgets";

type BudgetItem = BudgetsQuery["budgets"][number];
type Actual = { name: string; amount: number };

// ── form schema ───────────────────────────────────────────────────────────────

const addSchema = z.object({
  category: z.string().min(1, "Category is required"),
  amount: z.coerce.number().positive("Amount must be positive"),
});

type AddFormValues = z.infer<typeof addSchema>;

// ── AddCategorySheet ──────────────────────────────────────────────────────────

interface AddSheetProps {
  open: boolean;
  period: MonthYear;
  onClose: () => void;
  onSuccess: () => void;
}

function AddCategorySheet({ open, period, onClose, onSuccess }: AddSheetProps) {
  const form = useForm<AddFormValues>({ resolver: zodResolver(addSchema) });

  const [setBudget, { loading }] = useMutation(SetBudgetDocument, {
    onCompleted() {
      toast.success("Budget category added");
      form.reset();
      onSuccess();
    },
    onError(err) {
      toast.error(err.message.slice(0, 120));
    },
  });

  function onSubmit(values: AddFormValues) {
    setBudget({
      variables: {
        period: { month: period.month, year: period.year },
        category: values.category,
        amount: values.amount,
      },
    });
  }

  return (
    <Sheet
      open={open}
      onOpenChange={(o) => {
        if (!o) onClose();
      }}
    >
      <SheetContent className="sm:max-w-md">
        <SheetHeader>
          <SheetTitle>Add budget category</SheetTitle>
        </SheetHeader>
        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(onSubmit)}
            className="mt-4 flex flex-col gap-4"
          >
            <FormField
              control={form.control}
              name="category"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Category name</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g. Housing" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="amount"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Budget amount (₹)</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      step="1"
                      min="0"
                      placeholder="0"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <Button type="submit" disabled={loading} className="mt-1">
              {loading ? "Adding…" : "Add"}
            </Button>
          </form>
        </Form>
      </SheetContent>
    </Sheet>
  );
}

// ── progress bar ──────────────────────────────────────────────────────────────

function ProgressBar({ pct }: { pct: number }) {
  const clamped = Math.min(100, Math.max(0, pct));
  const color =
    clamped >= 100
      ? "bg-red-500"
      : clamped >= 80
        ? "bg-amber-500"
        : "bg-emerald-500";
  return (
    <div className="flex items-center gap-2">
      <div className="h-2 w-24 overflow-hidden rounded-full bg-secondary">
        <div
          className={cn(
            "h-full rounded-full transition-all duration-300",
            color
          )}
          style={{ width: `${clamped}%` }}
          role="progressbar"
          aria-valuenow={Math.round(clamped)}
          aria-valuemin={0}
          aria-valuemax={100}
        />
      </div>
      <span className="text-xs tabular-nums text-muted-foreground">
        {Math.round(pct)}%
      </span>
    </div>
  );
}

// ── SummaryBar ────────────────────────────────────────────────────────────────

function SummaryBar({
  totalBudgeted,
  totalActual,
}: {
  totalBudgeted: number;
  totalActual: number;
}) {
  const net = totalBudgeted - totalActual;
  const isOver = totalActual > totalBudgeted;
  return (
    <div className="flex flex-wrap gap-6 rounded-xl border p-4 text-sm">
      <div>
        <p className="text-xs text-muted-foreground">Total budgeted</p>
        <p className="font-semibold tabular-nums">
          {formatCurrency(totalBudgeted)}
        </p>
      </div>
      <div>
        <p className="text-xs text-muted-foreground">Total actual</p>
        <p className="font-semibold tabular-nums">
          {formatCurrency(totalActual)}
        </p>
      </div>
      <div>
        <p className="text-xs text-muted-foreground">Net remaining</p>
        <p
          className={cn(
            "font-semibold tabular-nums",
            isOver ? "text-red-600" : "text-emerald-600"
          )}
        >
          {isOver ? "−" : "+"}
          {formatCurrency(Math.abs(net))}
        </p>
      </div>
    </div>
  );
}

// ── BudgetsView ───────────────────────────────────────────────────────────────

export interface BudgetsViewProps {
  initialBudgets: BudgetItem[];
  categoryBreakdown: Actual[];
  period: MonthYear;
}

export function BudgetsView({
  initialBudgets,
  categoryBreakdown,
  period,
}: BudgetsViewProps) {
  const [sheetOpen, setSheetOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState("");

  const { data, refetch } = useQuery(BudgetsDocument, {
    variables: { period: { month: period.month, year: period.year } },
  });
  const budgets = data?.budgets ?? initialBudgets;

  const actualMap = new Map<string, number>(
    categoryBreakdown.map((c) => [c.name, c.amount])
  );

  const totalBudgeted = budgets.reduce((s, b) => s + b.amount, 0);
  const totalActual = budgets.reduce(
    (s, b) => s + (actualMap.get(b.category) ?? 0),
    0
  );

  // Inline-edit mutation: optimistic response works because the Budget ID is
  // known (we're updating an existing entry).
  const [setBudgetEdit] = useMutation(SetBudgetDocument, {
    optimisticResponse({ period: p, category, amount }) {
      const existing = budgets.find((b) => b.category === category);
      return {
        setBudget: {
          __typename: "Budget" as const,
          id: existing!.id,
          month: p.month,
          year: p.year,
          category,
          amount,
        },
      };
    },
    onCompleted() {
      toast.success("Budget updated");
    },
    onError(err) {
      toast.error(err.message.slice(0, 120));
    },
  });

  function startEdit(item: BudgetItem) {
    setEditingId(item.id);
    setEditValue(String(item.amount));
  }

  function commitEdit(item: BudgetItem) {
    const amount = parseFloat(editValue);
    setEditingId(null);
    if (!isNaN(amount) && amount > 0 && amount !== item.amount) {
      setBudgetEdit({
        variables: {
          period: { month: period.month, year: period.year },
          category: item.category,
          amount,
        },
      });
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          {budgets.length} budget
          {budgets.length !== 1 ? " categories" : " category"}
        </p>
        <Button onClick={() => setSheetOpen(true)} size="sm">
          <Plus className="mr-1.5 h-4 w-4" />
          Add category
        </Button>
      </div>

      {budgets.length === 0 ? (
        <div className="flex flex-col items-center gap-2 py-16 text-center">
          <p className="text-sm text-muted-foreground">
            No budget categories yet.
          </p>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setSheetOpen(true)}
          >
            Add your first category
          </Button>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Category</TableHead>
                <TableHead className="text-right">Budgeted</TableHead>
                <TableHead className="text-right">Actual</TableHead>
                <TableHead className="text-right">Remaining</TableHead>
                <TableHead>Progress</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {budgets.map((item) => {
                const actual = actualMap.get(item.category) ?? 0;
                const remaining = item.amount - actual;
                const pct = item.amount > 0 ? (actual / item.amount) * 100 : 0;
                const isOver = actual > item.amount;

                return (
                  <TableRow key={item.id}>
                    <TableCell className="font-medium">
                      {item.category}
                    </TableCell>

                    <TableCell className="text-right">
                      {editingId === item.id ? (
                        <Input
                          autoFocus
                          type="number"
                          step="1"
                          min="0"
                          value={editValue}
                          onChange={(e) => setEditValue(e.target.value)}
                          onBlur={() => commitEdit(item)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") e.currentTarget.blur();
                            if (e.key === "Escape") setEditingId(null);
                          }}
                          className="ml-auto h-7 w-28 text-right"
                        />
                      ) : (
                        <button
                          className="cursor-pointer tabular-nums hover:underline"
                          onClick={() => startEdit(item)}
                          aria-label={`Edit budget for ${item.category}`}
                        >
                          {formatCurrency(item.amount)}
                        </button>
                      )}
                    </TableCell>

                    <TableCell className="text-right tabular-nums">
                      {formatCurrency(actual)}
                    </TableCell>

                    <TableCell
                      className={cn(
                        "text-right tabular-nums",
                        isOver ? "text-red-600" : "text-emerald-600"
                      )}
                    >
                      {isOver ? "−" : "+"}
                      {formatCurrency(Math.abs(remaining))}
                    </TableCell>

                    <TableCell>
                      <ProgressBar pct={pct} />
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      )}

      <SummaryBar totalBudgeted={totalBudgeted} totalActual={totalActual} />

      <AddCategorySheet
        open={sheetOpen}
        period={period}
        onClose={() => setSheetOpen(false)}
        onSuccess={() => {
          setSheetOpen(false);
          refetch();
        }}
      />
    </div>
  );
}
