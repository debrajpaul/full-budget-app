import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn, formatCurrency } from "@/lib/utils";

type Segment = "NEEDS" | "WANTS" | "SAVINGS";
type Status = "ABOVE_TARGET" | "ON_TARGET" | "BELOW_TARGET";

interface SegmentRow {
  segment: Segment;
  actual: number;
  percentOfIncome: number;
  targetPercent: number;
  targetAmount: number;
  variance: number;
  status: Status;
}

interface SegmentationCardProps {
  totalIncome: number;
  segments: ReadonlyArray<SegmentRow>;
  unsegmentedExpenses: number;
  unclassified: number;
}

const SEGMENT_LABELS: Record<Segment, string> = {
  NEEDS: "Needs",
  WANTS: "Wants",
  SAVINGS: "Savings",
};

/** Above target is good for savings and bad for needs and wants */
const isHealthy = (segment: Segment, status: Status): boolean =>
  status === "ON_TARGET" ||
  (segment === "SAVINGS"
    ? status === "ABOVE_TARGET"
    : status === "BELOW_TARGET");

const STATUS_LABELS: Record<Status, string> = {
  ABOVE_TARGET: "Above target",
  ON_TARGET: "On target",
  BELOW_TARGET: "Below target",
};

export function SegmentationCard({
  totalIncome,
  segments,
  unsegmentedExpenses,
  unclassified,
}: SegmentationCardProps) {
  const uncategorised = unsegmentedExpenses + unclassified;

  return (
    <Card data-testid="segmentation-card">
      <CardHeader>
        <CardTitle>Needs, wants and savings</CardTitle>
        <CardDescription>
          Actual spend against the 50/30/20 rule
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-5">
        {totalIncome <= 0 && (
          <p
            className="text-sm text-muted-foreground"
            data-testid="segmentation-no-income"
          >
            No income recorded this month, so shares can&apos;t be calculated.
          </p>
        )}
        {segments.map((row) => {
          const healthy = isHealthy(row.segment, row.status);
          const width = Math.min(Math.max(row.percentOfIncome, 0), 100);
          return (
            <div
              key={row.segment}
              className="flex flex-col gap-1.5"
              data-testid={`segment-${row.segment.toLowerCase()}`}
            >
              <div className="flex items-center justify-between gap-2">
                <span className="text-sm font-medium">
                  {SEGMENT_LABELS[row.segment]}
                </span>
                <Badge variant={healthy ? "secondary" : "destructive"}>
                  {STATUS_LABELS[row.status]}
                </Badge>
              </div>
              <div
                role="progressbar"
                aria-label={`${SEGMENT_LABELS[row.segment]} share of income`}
                aria-valuemin={0}
                aria-valuemax={100}
                aria-valuenow={Math.round(width)}
                className="relative h-2 w-full rounded-full bg-muted"
              >
                <div
                  className={cn(
                    "h-full rounded-full",
                    healthy ? "bg-emerald-500" : "bg-rose-500"
                  )}
                  style={{ width: `${width}%` }}
                />
                <div
                  className="absolute top-[-2px] h-3 w-0.5 bg-foreground/60"
                  style={{ left: `${row.targetPercent}%` }}
                  aria-hidden="true"
                />
              </div>
              <p className="text-xs tabular-nums text-muted-foreground">
                {formatCurrency(row.actual)} ({row.percentOfIncome.toFixed(1)}%)
                of {formatCurrency(row.targetAmount)} target (
                {row.targetPercent}%)
              </p>
            </div>
          );
        })}
        {uncategorised > 0 && (
          <p
            className="text-xs text-muted-foreground"
            data-testid="segmentation-uncategorised"
          >
            {formatCurrency(uncategorised)} of spend has no sub-category and is
            left out of these shares. Reclassify those transactions to include
            it.
          </p>
        )}
      </CardContent>
    </Card>
  );
}
