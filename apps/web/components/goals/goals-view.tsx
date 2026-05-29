"use client";

import { useState } from "react";
import { useQuery, useMutation } from "@apollo/client";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { Plus, Pencil, Trash2 } from "lucide-react";
import { LineChart, Line, ResponsiveContainer } from "recharts";
import type { SavingsGoalsQuery } from "@api-client";
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
  SavingsGoalsDocument,
  CreateGoalDocument,
  ContributeGoalDocument,
  UpdateGoalDocument,
  DeleteGoalDocument,
} from "@/lib/graphql/goals";

type GoalItem = SavingsGoalsQuery["savingsGoals"][number];

// ── form schemas ───────────────────────────────────────────────────────────────

const createSchema = z.object({
  name: z.string().min(1, "Name is required"),
  target: z.coerce.number().positive("Must be positive"),
  deadline: z.string().min(1, "Deadline is required"),
  initialAmount: z.coerce.number().min(0).optional(),
});
type CreateValues = z.infer<typeof createSchema>;

const contributeSchema = z.object({
  amount: z.coerce.number().positive("Must be positive"),
});
type ContributeValues = z.infer<typeof contributeSchema>;

const editSchema = z.object({
  name: z.string().min(1, "Name is required"),
  target: z.coerce.number().positive("Must be positive"),
  deadline: z.string().min(1, "Deadline is required"),
});
type EditValues = z.infer<typeof editSchema>;

// ── Sparkline ─────────────────────────────────────────────────────────────────

function Sparkline({ data }: { data: { date: string; value: number }[] }) {
  return (
    <div className="h-10 w-full" data-testid="sparkline">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data}>
          <Line
            type="monotone"
            dataKey="value"
            stroke="#22c55e"
            dot={false}
            strokeWidth={1.5}
            isAnimationActive={false}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

// ── GoalProgress ──────────────────────────────────────────────────────────────

function GoalProgress({
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
            achieved ? "bg-emerald-500" : "bg-blue-500"
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

// ── GoalCard ──────────────────────────────────────────────────────────────────

interface GoalCardProps {
  goal: GoalItem;
  onContribute: () => void;
  onEdit: () => void;
  onDelete: () => void;
}

function GoalCard({ goal, onContribute, onEdit, onDelete }: GoalCardProps) {
  return (
    <div className="flex flex-col gap-3 rounded-xl border p-4">
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="font-semibold">{goal.name}</p>
          <p className="text-xs text-muted-foreground">
            Due {formatDate(goal.deadline as string)}
          </p>
        </div>
        <div className="flex gap-0.5">
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            onClick={onEdit}
            aria-label={`Edit ${goal.name}`}
          >
            <Pencil className="h-3.5 w-3.5" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 text-destructive hover:bg-destructive/10 hover:text-destructive"
            onClick={onDelete}
            aria-label={`Delete ${goal.name}`}
          >
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>

      <GoalProgress current={goal.current} target={goal.target} />

      {goal.history.length >= 2 && (
        <Sparkline data={goal.history as { date: string; value: number }[]} />
      )}

      <Button
        size="sm"
        variant="outline"
        className="mt-auto w-full"
        onClick={onContribute}
        aria-label={`Contribute to ${goal.name}`}
      >
        <Plus className="mr-1.5 h-4 w-4" />
        Contribute
      </Button>
    </div>
  );
}

// ── CreateGoalSheet ───────────────────────────────────────────────────────────

interface CreateSheetProps {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

function CreateGoalSheet({ open, onClose, onSuccess }: CreateSheetProps) {
  const form = useForm<CreateValues>({ resolver: zodResolver(createSchema) });

  const [create, { loading }] = useMutation(CreateGoalDocument, {
    onCompleted() {
      toast.success("Goal created");
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
          deadline: v.deadline,
          ...(v.initialAmount ? { initialAmount: v.initialAmount } : {}),
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
          <SheetTitle>New savings goal</SheetTitle>
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
                  <FormLabel>Goal name</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g. Emergency Fund" {...field} />
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
              name="deadline"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Deadline</FormLabel>
                  <FormControl>
                    <Input type="date" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="initialAmount"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Initial amount (₹, optional)</FormLabel>
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
            <Button type="submit" disabled={loading} className="mt-1">
              {loading ? "Creating…" : "Create goal"}
            </Button>
          </form>
        </Form>
      </SheetContent>
    </Sheet>
  );
}

// ── ContributeSheet ───────────────────────────────────────────────────────────

interface ContributeSheetProps {
  goal: GoalItem | null;
  onClose: () => void;
  onSuccess: () => void;
}

function ContributeSheet({ goal, onClose, onSuccess }: ContributeSheetProps) {
  const form = useForm<ContributeValues>({
    resolver: zodResolver(contributeSchema),
    defaultValues: { amount: "" as unknown as number },
  });

  const [contribute, { loading }] = useMutation(ContributeGoalDocument, {
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
    if (!goal) return;
    contribute({ variables: { input: { id: goal.id, amount: v.amount } } });
  }

  return (
    <Sheet
      open={!!goal}
      onOpenChange={(o) => {
        if (!o) onClose();
      }}
    >
      <SheetContent className="sm:max-w-md" aria-describedby={undefined}>
        <SheetHeader>
          <SheetTitle>Contribute to &ldquo;{goal?.name}&rdquo;</SheetTitle>
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

// ── EditGoalSheet ─────────────────────────────────────────────────────────────

interface EditSheetProps {
  goal: GoalItem | null;
  onClose: () => void;
  onSuccess: () => void;
}

function EditGoalSheet({ goal, onClose, onSuccess }: EditSheetProps) {
  const form = useForm<EditValues>({
    resolver: zodResolver(editSchema),
    defaultValues: { name: "", target: 0, deadline: "" },
    values: goal
      ? {
          name: goal.name,
          target: goal.target,
          deadline: goal.deadline as string,
        }
      : undefined,
  });

  const [update, { loading }] = useMutation(UpdateGoalDocument, {
    onCompleted() {
      toast.success("Goal updated");
      onSuccess();
    },
    onError(err) {
      toast.error(err.message.slice(0, 120));
    },
  });

  function onSubmit(v: EditValues) {
    if (!goal) return;
    update({
      variables: {
        id: goal.id,
        input: { name: v.name, target: v.target, deadline: v.deadline },
      },
    });
  }

  return (
    <Sheet
      open={!!goal}
      onOpenChange={(o) => {
        if (!o) onClose();
      }}
    >
      <SheetContent className="sm:max-w-md" aria-describedby={undefined}>
        <SheetHeader>
          <SheetTitle>Edit goal</SheetTitle>
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
                  <FormLabel>Goal name</FormLabel>
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
              name="deadline"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Deadline</FormLabel>
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

// ── DeleteGoalDialog ──────────────────────────────────────────────────────────

interface DeleteDialogProps {
  goal: GoalItem | null;
  onClose: () => void;
  onSuccess: () => void;
}

function DeleteGoalDialog({ goal, onClose, onSuccess }: DeleteDialogProps) {
  const [deleteGoal, { loading }] = useMutation(DeleteGoalDocument, {
    onCompleted() {
      toast.success("Goal deleted");
      onSuccess();
    },
    onError(err) {
      toast.error(err.message.slice(0, 120));
    },
  });

  return (
    <Dialog
      open={!!goal}
      onOpenChange={(o) => {
        if (!o) onClose();
      }}
    >
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Delete &ldquo;{goal?.name}&rdquo;?</DialogTitle>
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
            onClick={() => goal && deleteGoal({ variables: { id: goal.id } })}
          >
            {loading ? "Deleting…" : "Delete"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ── GoalsView ─────────────────────────────────────────────────────────────────

export interface GoalsViewProps {
  initialGoals: SavingsGoalsQuery["savingsGoals"];
}

export function GoalsView({ initialGoals }: GoalsViewProps) {
  const [createOpen, setCreateOpen] = useState(false);
  const [contributeGoal, setContributeGoal] = useState<GoalItem | null>(null);
  const [editGoal, setEditGoal] = useState<GoalItem | null>(null);
  const [deleteGoal, setDeleteGoal] = useState<GoalItem | null>(null);

  const { data, refetch } = useQuery(SavingsGoalsDocument);
  const goals = data?.savingsGoals ?? initialGoals;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          {goals.length} goal{goals.length !== 1 ? "s" : ""}
        </p>
        <Button size="sm" onClick={() => setCreateOpen(true)}>
          <Plus className="mr-1.5 h-4 w-4" />
          New goal
        </Button>
      </div>

      {goals.length === 0 ? (
        <div className="flex flex-col items-center gap-2 py-16 text-center">
          <p className="text-sm text-muted-foreground">No savings goals yet.</p>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setCreateOpen(true)}
          >
            Create your first goal
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {goals.map((goal) => (
            <GoalCard
              key={goal.id}
              goal={goal}
              onContribute={() => setContributeGoal(goal)}
              onEdit={() => setEditGoal(goal)}
              onDelete={() => setDeleteGoal(goal)}
            />
          ))}
        </div>
      )}

      <CreateGoalSheet
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        onSuccess={() => {
          setCreateOpen(false);
          refetch();
        }}
      />
      <ContributeSheet
        goal={contributeGoal}
        onClose={() => setContributeGoal(null)}
        onSuccess={() => {
          setContributeGoal(null);
          refetch();
        }}
      />
      <EditGoalSheet
        goal={editGoal}
        onClose={() => setEditGoal(null)}
        onSuccess={() => {
          setEditGoal(null);
          refetch();
        }}
      />
      <DeleteGoalDialog
        goal={deleteGoal}
        onClose={() => setDeleteGoal(null)}
        onSuccess={() => {
          setDeleteGoal(null);
          refetch();
        }}
      />
    </div>
  );
}
