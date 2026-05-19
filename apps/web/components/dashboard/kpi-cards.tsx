import {
  ArrowDownRight,
  ArrowUpRight,
  PiggyBank,
  type LucideIcon,
} from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { cn, formatCurrency } from "@/lib/utils";

interface Kpi {
  label: string;
  amount: number;
  icon: LucideIcon;
  tone: "positive" | "negative" | "neutral";
  hint: string;
}

interface KpiCardsProps {
  totalIncome: number;
  totalExpenses: number;
  savings: number;
}

export function KpiCards({
  totalIncome,
  totalExpenses,
  savings,
}: KpiCardsProps) {
  const kpis: Kpi[] = [
    {
      label: "Income",
      amount: totalIncome,
      icon: ArrowUpRight,
      tone: "positive",
      hint: "Total credits this month",
    },
    {
      label: "Expenses",
      amount: totalExpenses,
      icon: ArrowDownRight,
      tone: "negative",
      hint: "Total debits this month",
    },
    {
      label: "Net savings",
      amount: savings,
      icon: PiggyBank,
      tone: savings >= 0 ? "positive" : "negative",
      hint: "Income minus expenses",
    },
  ];

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {kpis.map(({ label, amount, icon: Icon, tone, hint }) => (
        <Card key={label}>
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardDescription>{label}</CardDescription>
              <Icon
                className={cn(
                  "h-4 w-4",
                  tone === "positive" && "text-emerald-500",
                  tone === "negative" && "text-rose-500",
                  tone === "neutral" && "text-muted-foreground"
                )}
              />
            </div>
            <CardTitle className="text-2xl tabular-nums">
              {formatCurrency(amount)}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground">{hint}</p>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
