"use client";
import { useMemo } from "react";
import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { formatCurrency } from "@/lib/utils";

interface CategoryDonutProps {
  data: Array<{ name: string; amount: number }>;
}

// Tailwind-friendly palette — readable on both themes
const COLORS = [
  "#0ea5e9", // sky-500
  "#f97316", // orange-500
  "#10b981", // emerald-500
  "#a855f7", // purple-500
  "#ef4444", // rose-500
  "#eab308", // yellow-500
  "#14b8a6", // teal-500
  "#ec4899", // pink-500
  "#8b5cf6", // violet-500
  "#22c55e", // green-500
];

export function CategoryDonut({ data }: CategoryDonutProps) {
  const filtered = useMemo(
    () => data.filter((d) => d.amount > 0).slice(0, 10),
    [data]
  );
  const total = useMemo(
    () => filtered.reduce((sum, d) => sum + d.amount, 0),
    [filtered]
  );

  return (
    <Card className="h-full">
      <CardHeader>
        <CardTitle className="text-base">Category breakdown</CardTitle>
        <CardDescription>Top spend categories this month</CardDescription>
      </CardHeader>
      <CardContent>
        {filtered.length === 0 ? (
          <EmptyState />
        ) : (
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center">
            <div className="h-64 w-full lg:w-64">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={filtered}
                    dataKey="amount"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={90}
                    paddingAngle={2}
                  >
                    {filtered.map((_, i) => (
                      <Cell key={i} fill={COLORS[i % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(value: number) => formatCurrency(value)}
                    contentStyle={{
                      background: "hsl(var(--background))",
                      borderRadius: 8,
                      border: "1px solid hsl(var(--border))",
                      fontSize: "12px",
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>

            {/* Legend / breakdown list */}
            <ul className="flex-1 space-y-2 text-sm">
              {filtered.map((row, i) => {
                const pct =
                  total > 0 ? Math.round((row.amount / total) * 100) : 0;
                return (
                  <li
                    key={row.name}
                    className="flex items-center justify-between gap-3"
                  >
                    <span className="flex items-center gap-2 truncate">
                      <span
                        className="h-2.5 w-2.5 shrink-0 rounded-sm"
                        style={{ background: COLORS[i % COLORS.length] }}
                      />
                      <span className="truncate">{row.name}</span>
                    </span>
                    <span className="shrink-0 tabular-nums text-muted-foreground">
                      {formatCurrency(row.amount, { compact: true })}{" "}
                      <span className="text-xs">({pct}%)</span>
                    </span>
                  </li>
                );
              })}
            </ul>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function EmptyState() {
  return (
    <div className="flex h-64 items-center justify-center text-sm text-muted-foreground">
      No categorised spend yet for this month.
    </div>
  );
}
