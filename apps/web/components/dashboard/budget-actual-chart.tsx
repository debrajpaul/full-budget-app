"use client";
import { useMemo } from "react";
import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { formatCurrency, formatDateShort } from "@/lib/utils";

interface BudgetActualChartProps {
  data: Array<{ date: string; budget: number; actual: number }>;
}

export function BudgetActualChart({ data }: BudgetActualChartProps) {
  const chartData = useMemo(
    () =>
      data.map((d) => ({
        ...d,
        // Recharts needs primitives for XAxis dataKey; keep raw date for tooltip
        label: formatDateShort(d.date),
      })),
    [data]
  );

  return (
    <Card className="h-full">
      <CardHeader>
        <CardTitle className="text-base">Budget vs Actual</CardTitle>
        <CardDescription>
          Cumulative spend tracked against budget over the month
        </CardDescription>
      </CardHeader>
      <CardContent>
        {chartData.length === 0 ? (
          <EmptyState />
        ) : (
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart
                data={chartData}
                margin={{ top: 5, right: 12, left: 0, bottom: 0 }}
              >
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis
                  dataKey="label"
                  className="text-xs"
                  tick={{ fontSize: 11 }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  className="text-xs"
                  tick={{ fontSize: 11 }}
                  tickFormatter={(v: number) =>
                    formatCurrency(v, { compact: true })
                  }
                  axisLine={false}
                  tickLine={false}
                  width={56}
                />
                <Tooltip
                  formatter={(value: number) => formatCurrency(value)}
                  contentStyle={{
                    background: "hsl(var(--background))",
                    borderRadius: 8,
                    border: "1px solid hsl(var(--border))",
                    fontSize: "12px",
                  }}
                />
                <Legend
                  iconSize={10}
                  wrapperStyle={{ fontSize: "12px", paddingTop: 8 }}
                />
                <Line
                  type="monotone"
                  dataKey="budget"
                  name="Budget"
                  stroke="#10b981"
                  strokeWidth={2}
                  dot={false}
                  isAnimationActive={false}
                />
                <Line
                  type="monotone"
                  dataKey="actual"
                  name="Actual"
                  stroke="#0ea5e9"
                  strokeWidth={2}
                  dot={false}
                  isAnimationActive={false}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function EmptyState() {
  return (
    <div className="flex h-64 items-center justify-center text-sm text-muted-foreground">
      No spend data yet for this month.
    </div>
  );
}
