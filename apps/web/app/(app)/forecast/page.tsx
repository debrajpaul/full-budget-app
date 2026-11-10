"use client";

import { useState, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { useLazyQuery } from "@apollo/client";
import { TrendingDown, Banknote, Download, Loader2 } from "lucide-react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import type { TooltipProps } from "recharts";
import { AlertSeverity, AlertType } from "@app/api-client";
import type { ForecastMonthQuery } from "@app/api-client";
import { formatCurrency, parseMonthYearParams } from "@/lib/utils";
import { MonthPicker } from "@/components/dashboard/month-picker";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ForecastMonthDocument } from "@/lib/graphql/forecast";
import { triggerCsvDownload } from "./csv";

export const dynamic = "force-dynamic";

type ForecastAlert = ForecastMonthQuery["forecastMonth"]["alerts"][number];

// ── Chart tooltip ──────────────────────────────────────────────────────────────

function ChartTooltip({
  active,
  payload,
  label,
}: TooltipProps<number, string>) {
  if (!active || !payload?.length) return null;
  const raw = payload[0]?.payload as { net: number; runningBalance: number };
  return (
    <div className="rounded border bg-background p-2 text-xs shadow-md">
      <p className="mb-1 font-semibold">Day {label}</p>
      <p>Net: {formatCurrency(raw.net)}</p>
      <p className="text-blue-600">
        Balance: {formatCurrency(raw.runningBalance)}
      </p>
    </div>
  );
}

// ── Alert maps ────────────────────────────────────────────────────────────────

const SEVERITY_CARD: Record<AlertSeverity, string> = {
  [AlertSeverity.Critical]: "border-red-200 bg-red-50 text-red-800",
  [AlertSeverity.Warning]: "border-amber-200 bg-amber-50 text-amber-800",
  [AlertSeverity.Info]: "border-blue-200 bg-blue-50 text-blue-800",
};

const SEVERITY_BADGE: Record<AlertSeverity, string> = {
  [AlertSeverity.Critical]: "bg-red-100 text-red-700",
  [AlertSeverity.Warning]: "bg-amber-100 text-amber-700",
  [AlertSeverity.Info]: "bg-blue-100 text-blue-700",
};

const ALERT_ICON: Record<AlertType, typeof TrendingDown> = {
  [AlertType.LowBalance]: TrendingDown,
  [AlertType.LargeExpense]: Banknote,
};

// ── Alert card ────────────────────────────────────────────────────────────────

function AlertCard({ alert }: { alert: ForecastAlert }) {
  const Icon = ALERT_ICON[alert.type] ?? TrendingDown;
  return (
    <div
      className={`flex items-start gap-3 rounded-lg border p-3 text-sm ${SEVERITY_CARD[alert.severity]}`}
    >
      <Icon className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
      <div className="flex flex-1 flex-col gap-1">
        <div className="flex items-center gap-2">
          <span className="font-medium tabular-nums">{alert.date}</span>
          <span
            className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium capitalize ${SEVERITY_BADGE[alert.severity]}`}
          >
            {alert.severity}
          </span>
        </div>
        <p>{alert.message}</p>
      </div>
    </div>
  );
}

// ── Main content ──────────────────────────────────────────────────────────────

function ForecastContent() {
  const searchParams = useSearchParams();
  const period = parseMonthYearParams(searchParams);

  const [startingBalance, setStartingBalance] = useState("");
  const [lowThreshold, setLowThreshold] = useState("1000");
  const [largeThreshold, setLargeThreshold] = useState("5000");

  const [runForecast, { called, loading, data }] = useLazyQuery(
    ForecastMonthDocument
  );

  useEffect(() => {
    runForecast({
      variables: {
        year: period.year,
        month: period.month,
        options: {
          ...(startingBalance !== ""
            ? { startingBalance: parseFloat(startingBalance) }
            : {}),
          ...(lowThreshold !== ""
            ? { lowBalanceThreshold: parseFloat(lowThreshold) }
            : {}),
          ...(largeThreshold !== ""
            ? { largeExpenseThreshold: parseFloat(largeThreshold) }
            : {}),
        },
      },
    });
  }, [
    period.year,
    period.month,
    startingBalance,
    lowThreshold,
    largeThreshold,
    runForecast,
  ]);

  const result = data?.forecastMonth;
  const days = result?.days ?? [];
  const alerts = result?.alerts ?? [];

  const chartData = days.map((d) => ({
    day: parseInt((d.date as string).split("-")[2] ?? "0", 10),
    inflow: d.inflow,
    outflow: d.outflow,
    runningBalance: d.runningBalance ?? 0,
    net: d.net,
  }));

  const hasData = called && !loading && days.length > 0;

  return (
    <div className="flex flex-col gap-4">
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Forecast</h1>
          <p className="text-sm text-muted-foreground">
            Daily cash-flow projection
          </p>
        </div>
        <MonthPicker current={period} basePath="/forecast" />
      </div>

      {/* Controls */}
      <div className="flex flex-wrap items-end gap-4">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="startingBalance">Starting Balance (₹)</Label>
          <Input
            id="startingBalance"
            type="number"
            min="0"
            step="100"
            placeholder="Auto"
            value={startingBalance}
            onChange={(e) => setStartingBalance(e.target.value)}
            className="w-36"
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="lowThreshold">Low Balance Alert (₹)</Label>
          <Input
            id="lowThreshold"
            type="number"
            min="0"
            step="100"
            value={lowThreshold}
            onChange={(e) => setLowThreshold(e.target.value)}
            className="w-36"
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="largeThreshold">Large Expense Alert (₹)</Label>
          <Input
            id="largeThreshold"
            type="number"
            min="0"
            step="100"
            value={largeThreshold}
            onChange={(e) => setLargeThreshold(e.target.value)}
            className="w-36"
          />
        </div>
      </div>

      {/* Chart area */}
      {!called || loading ? (
        <div className="flex h-64 items-center justify-center rounded-xl border">
          <Loader2
            className="h-6 w-6 animate-spin text-muted-foreground"
            aria-label="Loading forecast"
          />
        </div>
      ) : days.length === 0 ? (
        <div className="flex h-64 items-center justify-center rounded-xl border">
          <p className="text-sm text-muted-foreground">
            No forecast data for this period.
          </p>
        </div>
      ) : (
        <>
          {/* Summary + export */}
          <div className="flex flex-wrap items-center gap-6 rounded-xl border p-4 text-sm">
            <div>
              <p className="text-xs text-muted-foreground">Starting balance</p>
              <p className="font-semibold tabular-nums">
                {formatCurrency(result?.startingBalance ?? 0)}
              </p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Ending balance</p>
              <p className="font-semibold tabular-nums">
                {formatCurrency(result?.endingBalance ?? 0)}
              </p>
            </div>
            <Button
              variant="outline"
              size="sm"
              className="ml-auto"
              onClick={() =>
                triggerCsvDownload(days, period.year, period.month)
              }
              aria-label="Export forecast as CSV"
            >
              <Download className="mr-1.5 h-4 w-4" />
              Export CSV
            </Button>
          </div>

          {/* Line chart */}
          <div className="rounded-xl border p-4" data-testid="forecast-chart">
            <ResponsiveContainer width="100%" height={300}>
              <LineChart
                data={chartData}
                margin={{ top: 4, right: 16, bottom: 16, left: 16 }}
              >
                <CartesianGrid
                  strokeDasharray="3 3"
                  className="stroke-border"
                />
                <XAxis
                  dataKey="day"
                  tick={{ fontSize: 11 }}
                  label={{
                    value: "Day of month",
                    position: "insideBottom",
                    offset: -10,
                    fontSize: 11,
                  }}
                />
                <YAxis
                  tick={{ fontSize: 11 }}
                  tickFormatter={(v: number) =>
                    `₹${v >= 1000 ? `${(v / 1000).toFixed(0)}k` : v}`
                  }
                />
                <Tooltip content={<ChartTooltip />} />
                <Legend verticalAlign="top" height={32} />
                <Line
                  type="monotone"
                  dataKey="inflow"
                  stroke="#22c55e"
                  dot={false}
                  name="Inflow"
                  strokeWidth={1.5}
                />
                <Line
                  type="monotone"
                  dataKey="outflow"
                  stroke="#ef4444"
                  dot={false}
                  name="Outflow"
                  strokeWidth={1.5}
                />
                <Line
                  type="monotone"
                  dataKey="runningBalance"
                  stroke="#3b82f6"
                  dot={false}
                  name="Balance"
                  strokeWidth={2}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </>
      )}

      {/* Alerts */}
      {hasData && alerts.length > 0 && (
        <div className="flex flex-col gap-2">
          <p className="text-sm font-medium">
            {alerts.length} alert{alerts.length !== 1 ? "s" : ""}
          </p>
          {alerts.map((alert, i) => (
            <AlertCard key={i} alert={alert} />
          ))}
        </div>
      )}
    </div>
  );
}

export default function ForecastPage() {
  return (
    <Suspense
      fallback={
        <div className="flex h-64 items-center justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      }
    >
      <ForecastContent />
    </Suspense>
  );
}
