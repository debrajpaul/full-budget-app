"use client";

import { useState } from "react";
import { useQuery, useMutation } from "@apollo/client";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { Plus } from "lucide-react";
import { RecurringFrequency, TransactionType } from "@app/api-client";
import type { RecurringTransactionsQuery } from "@app/api-client";
import { formatCurrency, formatDate } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  RecurringTransactionsDocument,
  CreateRecurringDocument,
  GenerateRecurringDocument,
} from "@/lib/graphql/recurring";

type RxItem = RecurringTransactionsQuery["recurringTransactions"][number];

// ── constants ─────────────────────────────────────────────────────────────────

const FREQ_OPTIONS = [
  RecurringFrequency.Monthly,
  RecurringFrequency.Weekly,
  RecurringFrequency.Biweekly,
  RecurringFrequency.Yearly,
] as const;

const TYPE_OPTIONS = [TransactionType.Income, TransactionType.Expense] as const;

const FREQ_LABELS: Record<(typeof FREQ_OPTIONS)[number], string> = {
  [RecurringFrequency.Monthly]: "Monthly",
  [RecurringFrequency.Weekly]: "Weekly",
  [RecurringFrequency.Biweekly]: "Bi-weekly",
  [RecurringFrequency.Yearly]: "Yearly",
};

const TYPE_LABELS: Record<(typeof TYPE_OPTIONS)[number], string> = {
  [TransactionType.Income]: "Income",
  [TransactionType.Expense]: "Expense",
};

// ── form schema ───────────────────────────────────────────────────────────────

const addSchema = z
  .object({
    description: z.string().min(1, "Description is required"),
    amount: z.coerce.number().positive("Must be a positive number"),
    category: z.string().optional(),
    type: z.enum(TYPE_OPTIONS),
    frequency: z.enum(FREQ_OPTIONS),
    dayOfMonth: z.string().optional(),
    startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Use YYYY-MM-DD format"),
  })
  .refine(
    (d) => {
      if (d.frequency !== RecurringFrequency.Monthly) return true;
      const day = parseInt(d.dayOfMonth ?? "");
      return !isNaN(day) && day >= 1 && day <= 31;
    },
    { message: "Day of month must be 1–31", path: ["dayOfMonth"] }
  );

type AddFormValues = z.infer<typeof addSchema>;

// ── RecurringCard ─────────────────────────────────────────────────────────────

function RecurringCard({ item }: { item: RxItem }) {
  const isIncome = item.type === TransactionType.Income;
  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between gap-2">
          <CardTitle className="text-sm font-medium leading-snug">
            {item.description}
          </CardTitle>
          <Badge
            variant="secondary"
            className={
              isIncome
                ? "bg-emerald-50 text-emerald-700 hover:bg-emerald-50"
                : "bg-red-50 text-red-700 hover:bg-red-50"
            }
          >
            {TYPE_LABELS[item.type]}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="flex flex-col gap-2 text-sm">
        <p className="text-lg font-semibold tabular-nums">
          {isIncome ? "+" : "−"}
          {formatCurrency(item.amount)}
        </p>
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="outline">{FREQ_LABELS[item.frequency]}</Badge>
          {item.frequency === RecurringFrequency.Monthly &&
            item.dayOfMonth != null && (
              <span className="text-xs text-muted-foreground">
                Day {item.dayOfMonth} of month
              </span>
            )}
          {item.category && (
            <span className="text-xs text-muted-foreground">
              {item.category}
            </span>
          )}
        </div>
        {item.nextRunDate && (
          <p className="text-xs text-muted-foreground">
            Next: {formatDate(item.nextRunDate)}
          </p>
        )}
      </CardContent>
    </Card>
  );
}

// ── AddRecurringSheet ─────────────────────────────────────────────────────────

interface AddSheetProps {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

function AddRecurringSheet({ open, onClose, onSuccess }: AddSheetProps) {
  const form = useForm<AddFormValues>({ resolver: zodResolver(addSchema) });
  const frequency = form.watch("frequency");

  const [createRecurring, { loading }] = useMutation(CreateRecurringDocument, {
    onCompleted() {
      toast.success("Recurring transaction added");
      form.reset();
      onSuccess();
    },
    onError(err) {
      toast.error(err.message.slice(0, 120));
    },
  });

  async function onSubmit(values: AddFormValues) {
    await createRecurring({
      variables: {
        input: {
          description: values.description,
          amount: values.amount,
          category: values.category || undefined,
          type: values.type,
          frequency: values.frequency,
          startDate: values.startDate,
          ...(values.frequency === RecurringFrequency.Monthly &&
          values.dayOfMonth
            ? { dayOfMonth: parseInt(values.dayOfMonth) }
            : {}),
        },
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
      <SheetContent className="flex flex-col gap-4 overflow-y-auto sm:max-w-md">
        <SheetHeader>
          <SheetTitle>Add recurring transaction</SheetTitle>
        </SheetHeader>

        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(onSubmit)}
            className="flex flex-col gap-4"
          >
            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Description</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g. Monthly rent" {...field} />
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
                  <FormLabel>Amount (₹)</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      step="0.01"
                      min="0"
                      placeholder="0.00"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="type"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Type</FormLabel>
                  <Select
                    onValueChange={field.onChange}
                    defaultValue={field.value}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select type…" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {TYPE_OPTIONS.map((t) => (
                        <SelectItem key={t} value={t}>
                          {TYPE_LABELS[t]}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="frequency"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Frequency</FormLabel>
                  <Select
                    onValueChange={field.onChange}
                    defaultValue={field.value}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select frequency…" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {FREQ_OPTIONS.map((f) => (
                        <SelectItem key={f} value={f}>
                          {FREQ_LABELS[f]}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            {frequency === RecurringFrequency.Monthly && (
              <FormField
                control={form.control}
                name="dayOfMonth"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Day of month</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        min="1"
                        max="31"
                        placeholder="1–31"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            <FormField
              control={form.control}
              name="category"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>
                    Category{" "}
                    <span className="text-muted-foreground">(optional)</span>
                  </FormLabel>
                  <FormControl>
                    <Input placeholder="e.g. Housing" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="startDate"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Start date</FormLabel>
                  <FormControl>
                    <Input type="date" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <Button type="submit" disabled={loading} className="mt-1">
              {loading ? "Adding…" : "Add recurring"}
            </Button>
          </form>
        </Form>
      </SheetContent>
    </Sheet>
  );
}

// ── RecurringView ─────────────────────────────────────────────────────────────

interface RecurringViewProps {
  initialItems: RxItem[];
}

export function RecurringView({ initialItems }: RecurringViewProps) {
  const [sheetOpen, setSheetOpen] = useState(false);

  const { data, refetch } = useQuery(RecurringTransactionsDocument);
  const items = data?.recurringTransactions ?? initialItems;

  const [generateRecurring, { loading: generating }] = useMutation(
    GenerateRecurringDocument,
    {
      onCompleted(d) {
        toast.success(
          `Generated ${d.generateRecurringTransactions} transaction(s) for this month`
        );
      },
      onError(err) {
        toast.error(err.message.slice(0, 120));
      },
    }
  );

  function handleGenerate() {
    const now = new Date();
    generateRecurring({
      variables: { month: now.getMonth() + 1, year: now.getFullYear() },
    });
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">
            Recurring Transactions
          </h1>
          <p className="text-sm text-muted-foreground">
            Manage and generate your scheduled transactions.
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={handleGenerate}
            disabled={generating}
          >
            {generating ? "Generating…" : "Generate for this month"}
          </Button>
          <Button onClick={() => setSheetOpen(true)}>
            <Plus className="mr-1.5 h-4 w-4" />
            Add recurring
          </Button>
        </div>
      </div>

      {items.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-2 py-16 text-center">
          <p className="text-sm text-muted-foreground">
            No recurring transactions yet.
          </p>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setSheetOpen(true)}
          >
            Add your first recurring transaction
          </Button>
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {items.map((item) => (
            <RecurringCard key={item.id} item={item} />
          ))}
        </div>
      )}

      <AddRecurringSheet
        open={sheetOpen}
        onClose={() => setSheetOpen(false)}
        onSuccess={() => {
          setSheetOpen(false);
          refetch();
        }}
      />
    </div>
  );
}
