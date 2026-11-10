"use client";

import { useState } from "react";
import { useQuery, useMutation } from "@apollo/client";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { Plus, Pencil, Trash2, CalendarClock } from "lucide-react";
import { LineChart, Line, ResponsiveContainer } from "recharts";
import type { SinkingFundsQuery } from "@app/api-client";
import { cn, formatCurrency, formatDate } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  SinkingFundsDocument,
  CreateSinkingFundDocument,
  ContributeSinkingFundDocument,
  UpdateSinkingFundDocument,
  DeleteSinkingFundDocument,
} from "@/lib/graphql/sinking-funds";

type FundItem = SinkingFundsQuery["sinkingFunds"][number];

// ── form schemas ───────────────────────────────────────────────────────────────

const createSchema = z.object({
  name: z.string().min(1, "Name is required"),
  target: z.coerce.number().positive("Must be positive"),
  monthlyContribution: z.coerce.number().min(0).optional(),
  deadline: z.string().optional(),
});
type CreateValues = z.infer<typeof createSchema>;

const contributeSchema = z.object({
  amount: z.coerce.number().positive("Must be positive"),
});
type ContributeValues = z.infer<typeof contributeSchema>;

const editSchema = z.object({
  name: z.string().min(1, "Name is required"),
  target: z.coerce.number().positive("Must be positive"),
  monthlyContribution: z.coerce.number().min(0).optional(),
  deadline: z.string().optional(),
});
type EditValues = z.infer<typeof editSchema>;

// ── helpers ────────────────────────────────────────────────────────────────────

function monthsRemaining(deadline: string): number {
  const now = new Date();
  const end = new Date(deadline);
  return Math.max(
    0,
    (end.getFullYear() - now.getFullYear()) * 12 +
      (end.getMonth() - now.getMonth())
  );
}

function monthsToGoal(
  target: number,
  current: number,
  monthly: number
): number {
  if (monthly <= 0 || current >= target) return 0;
  return Math.ceil((target - current) / monthly);
}

// ── Sparkline ─────────────────────────────────────────────────────────────────

function Sparkline({ data }: { data: { date: string; value: number }[] }) {
  return (
    <div className="h-10 w-full" data-testid="sparkline">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data}>
          <Line
            type="monotone"
            dataKey="value"
            stroke="#f59e0b"
            dot={false}
            strokeWidth={1.5}
            isAnimationActive={false}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

// ── FundProgress ──────────────────────────────────────────────────────────────

function FundProgress({
  current,
  target,
}: {
  current: number;
  target: number;
}) {
  const pct = target > 0 ? Math.min(100, (current / target) * 100) : 0;
  const achieved = current >= target;
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between text-xs">
        <span className="tabular-nums text-muted-foreground">
          {formatCurrency(current)}
        </span>
        <span
          className={cn(
            "font-medium tabular-nums",
            achieved ? "text-emerald-600" : "text-muted-foreground"
          )}
        >
          {Math.round(pct)}%{achieved && " ✓"}
        </span>
      </div>
      <div className="h-2 w-full overflow-hidden rounded-full bg-secondary">
        <div
          className={cn(
            "h-full rounded-full transition-all duration-300",
            achieved ? "bg-emerald-500" : "bg-amber-400"
          )}
          style={{ width: `${pct}%` }}
          role="progressbar"
          aria-valuenow={Math.round(pct)}
          aria-valuemin={0}
          aria-valuemax={100}
        />
      </div>
      <p className="text-right text-xs text-muted-foreground">
        of {formatCurrency(target)}
      </p>
    </div>
  );
}

// ── FundCard ──────────────────────────────────────────────────────────────────

interface FundCardProps {
  fund: FundItem;
  onContribute: () => void;
  onEdit: () => void;
  onDelete: () => void;
}

function FundCard({ fund, onContribute, onEdit, onDelete }: FundCardProps) {
  const remaining =
    fund.deadline != null
      ? monthsRemaining(fund.deadline as string)
      : fund.monthlyContribution != null && fund.monthlyContribution > 0
        ? monthsToGoal(fund.target, fund.current, fund.monthlyContribution)
        : null;

  return (
    <div className="flex flex-col gap-3 rounded-xl border p-4">
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="font-semibold">{fund.name}</p>
          <div className="flex flex-col gap-0.5 text-xs text-muted-foreground">
            {fund.deadline != null && (
              <span>Due {formatDate(fund.deadline as string)}</span>
            )}
            {fund.monthlyContribution != null && (
              <span>{formatCurrency(fund.monthlyContribution)}/mo</span>
            )}
          </div>
        </div>
        <div className="flex gap-0.5">
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            onClick={onEdit}
            aria-label={`Edit ${fund.name}`}
          >
            <Pencil className="h-3.5 w-3.5" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 text-destructive hover:bg-destructive/10 hover:text-destructive"
            onClick={onDelete}
            aria-label={`Delete ${fund.name}`}
          >
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>

      <FundProgress current={fund.current} target={fund.target} />

      {remaining !== null && remaining > 0 && (
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <CalendarClock className="h-3.5 w-3.5 shrink-0" aria-hidden />
          <span data-testid="months-remaining">{remaining} mo remaining</span>
        </div>
      )}

      {fund.history.length >= 2 && (
        <Sparkline data={fund.history as { date: string; value: number }[]} />
      )}

      <Button
        size="sm"
        variant="outline"
        className="mt-auto w-full"
        onClick={onContribute}
        aria-label={`Contribute to ${fund.name}`}
      >
        <Plus className="mr-1.5 h-4 w-4" />
        Contribute
      </Button>
    </div>
  );
}

// ── CreateSinkingFundSheet ─────────────────────────────────────────────────────

interface CreateSheetProps {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

function CreateSinkingFundSheet({
  open,
  onClose,
  onSuccess,
}: CreateSheetProps) {
  const form = useForm<CreateValues>({ resolver: zodResolver(createSchema) });

  const [create, { loading }] = useMutation(CreateSinkingFundDocument, {
    onCompleted() {
      toast.success("Sinking fund created");
      form.reset();
      onSuccess();
    },
    onError(err) {
      toast.error(err.message.slice(0, 120));
    },
  });

  function onSubmit(v: CreateValues) {
    create({
      variables: {
        input: {
          name: v.name,
          target: v.target,
          ...(v.monthlyContribution
            ? { monthlyContribution: v.monthlyContribution }
            : {}),
          ...(v.deadline ? { deadline: v.deadline } : {}),
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
      <SheetContent className="sm:max-w-md" aria-describedby={undefined}>
        <SheetHeader>
          <SheetTitle>New sinking fund</SheetTitle>
        </SheetHeader>
        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(onSubmit)}
            className="mt-4 flex flex-col gap-4"
          >
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Fund name</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g. Car Replacement" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="target"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Target amount (₹)</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      step="100"
                      min="0"
                      placeholder="0"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="monthlyContribution"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Monthly contribution (₹, optional)</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      step="100"
                      min="0"
                      placeholder="0"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="deadline"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Deadline (optional)</FormLabel>
                  <FormControl>
                    <Input type="date" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <Button type="submit" disabled={loading} className="mt-1">
              {loading ? "Creating…" : "Create fund"}
            </Button>
          </form>
        </Form>
      </SheetContent>
    </Sheet>
  );
}

// ── ContributeSheet ───────────────────────────────────────────────────────────

interface ContributeSheetProps {
  fund: FundItem | null;
  onClose: () => void;
  onSuccess: () => void;
}

function ContributeSheet({ fund, onClose, onSuccess }: ContributeSheetProps) {
  const form = useForm<ContributeValues>({
    resolver: zodResolver(contributeSchema),
    defaultValues: { amount: "" as unknown as number },
  });

  const [contribute, { loading }] = useMutation(ContributeSinkingFundDocument, {
    onCompleted() {
      toast.success("Contribution added");
      form.reset();
      onSuccess();
    },
    onError(err) {
      toast.error(err.message.slice(0, 120));
    },
  });

  function onSubmit(v: ContributeValues) {
    if (!fund) return;
    contribute({ variables: { input: { id: fund.id, amount: v.amount } } });
  }

  return (
    <Sheet
      open={!!fund}
      onOpenChange={(o) => {
        if (!o) onClose();
      }}
    >
      <SheetContent className="sm:max-w-md" aria-describedby={undefined}>
        <SheetHeader>
          <SheetTitle>Contribute to &ldquo;{fund?.name}&rdquo;</SheetTitle>
        </SheetHeader>
        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(onSubmit)}
            className="mt-4 flex flex-col gap-4"
          >
            <FormField
              control={form.control}
              name="amount"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Amount (₹)</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      step="100"
                      min="0"
                      placeholder="0"
                      autoFocus
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <Button type="submit" disabled={loading} className="mt-1">
              {loading ? "Adding…" : "Add contribution"}
            </Button>
          </form>
        </Form>
      </SheetContent>
    </Sheet>
  );
}

// ── EditSinkingFundSheet ───────────────────────────────────────────────────────

interface EditSheetProps {
  fund: FundItem | null;
  onClose: () => void;
  onSuccess: () => void;
}

function EditSinkingFundSheet({ fund, onClose, onSuccess }: EditSheetProps) {
  const form = useForm<EditValues>({
    resolver: zodResolver(editSchema),
    defaultValues: {
      name: "",
      target: 0,
      monthlyContribution: 0,
      deadline: "",
    },
    values: fund
      ? {
          name: fund.name,
          target: fund.target,
          monthlyContribution: fund.monthlyContribution ?? undefined,
          deadline: (fund.deadline as string | null) ?? "",
        }
      : undefined,
  });

  const [update, { loading }] = useMutation(UpdateSinkingFundDocument, {
    onCompleted() {
      toast.success("Sinking fund updated");
      onSuccess();
    },
    onError(err) {
      toast.error(err.message.slice(0, 120));
    },
  });

  function onSubmit(v: EditValues) {
    if (!fund) return;
    update({
      variables: {
        id: fund.id,
        input: {
          name: v.name,
          target: v.target,
          ...(v.monthlyContribution != null
            ? { monthlyContribution: v.monthlyContribution }
            : {}),
          ...(v.deadline ? { deadline: v.deadline } : {}),
        },
      },
    });
  }

  return (
    <Sheet
      open={!!fund}
      onOpenChange={(o) => {
        if (!o) onClose();
      }}
    >
      <SheetContent className="sm:max-w-md" aria-describedby={undefined}>
        <SheetHeader>
          <SheetTitle>Edit sinking fund</SheetTitle>
        </SheetHeader>
        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(onSubmit)}
            className="mt-4 flex flex-col gap-4"
          >
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Fund name</FormLabel>
                  <FormControl>
                    <Input {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="target"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Target amount (₹)</FormLabel>
                  <FormControl>
                    <Input type="number" step="100" min="0" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="monthlyContribution"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Monthly contribution (₹)</FormLabel>
                  <FormControl>
                    <Input type="number" step="100" min="0" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="deadline"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Deadline (optional)</FormLabel>
                  <FormControl>
                    <Input type="date" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <Button type="submit" disabled={loading} className="mt-1">
              {loading ? "Saving…" : "Save changes"}
            </Button>
          </form>
        </Form>
      </SheetContent>
    </Sheet>
  );
}

// ── DeleteSinkingFundDialog ────────────────────────────────────────────────────

interface DeleteDialogProps {
  fund: FundItem | null;
  onClose: () => void;
  onSuccess: () => void;
}

function DeleteSinkingFundDialog({
  fund,
  onClose,
  onSuccess,
}: DeleteDialogProps) {
  const [deleteFund, { loading }] = useMutation(DeleteSinkingFundDocument, {
    onCompleted() {
      toast.success("Sinking fund deleted");
      onSuccess();
    },
    onError(err) {
      toast.error(err.message.slice(0, 120));
    },
  });

  return (
    <Dialog
      open={!!fund}
      onOpenChange={(o) => {
        if (!o) onClose();
      }}
    >
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Delete &ldquo;{fund?.name}&rdquo;?</DialogTitle>
          <DialogDescription>
            This action cannot be undone. All contribution history will be
            permanently removed.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={loading}>
            Cancel
          </Button>
          <Button
            variant="destructive"
            disabled={loading}
            onClick={() => fund && deleteFund({ variables: { id: fund.id } })}
          >
            {loading ? "Deleting…" : "Delete"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ── SinkingFundsView ──────────────────────────────────────────────────────────

export interface SinkingFundsViewProps {
  initialFunds: SinkingFundsQuery["sinkingFunds"];
}

export function SinkingFundsView({ initialFunds }: SinkingFundsViewProps) {
  const [createOpen, setCreateOpen] = useState(false);
  const [contributeFund, setContributeFund] = useState<FundItem | null>(null);
  const [editFund, setEditFund] = useState<FundItem | null>(null);
  const [deleteFund, setDeleteFund] = useState<FundItem | null>(null);

  const { data, refetch } = useQuery(SinkingFundsDocument);
  const funds = data?.sinkingFunds ?? initialFunds;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          {funds.length} fund{funds.length !== 1 ? "s" : ""}
        </p>
        <Button size="sm" onClick={() => setCreateOpen(true)}>
          <Plus className="mr-1.5 h-4 w-4" />
          New sinking fund
        </Button>
      </div>

      {funds.length === 0 ? (
        <div className="flex flex-col items-center gap-2 py-16 text-center">
          <p className="text-sm text-muted-foreground">No sinking funds yet.</p>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setCreateOpen(true)}
          >
            Create your first fund
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {funds.map((fund) => (
            <FundCard
              key={fund.id}
              fund={fund}
              onContribute={() => setContributeFund(fund)}
              onEdit={() => setEditFund(fund)}
              onDelete={() => setDeleteFund(fund)}
            />
          ))}
        </div>
      )}

      <CreateSinkingFundSheet
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        onSuccess={() => {
          setCreateOpen(false);
          refetch();
        }}
      />
      <ContributeSheet
        fund={contributeFund}
        onClose={() => setContributeFund(null)}
        onSuccess={() => {
          setContributeFund(null);
          refetch();
        }}
      />
      <EditSinkingFundSheet
        fund={editFund}
        onClose={() => setEditFund(null)}
        onSuccess={() => {
          setEditFund(null);
          refetch();
        }}
      />
      <DeleteSinkingFundDialog
        fund={deleteFund}
        onClose={() => setDeleteFund(null)}
        onSuccess={() => {
          setDeleteFund(null);
          refetch();
        }}
      />
    </div>
  );
}
