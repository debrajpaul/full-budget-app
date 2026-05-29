import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { MockedProvider } from "@apollo/client/testing";
import type { MockedResponse } from "@apollo/client/testing";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AlertSeverity, AlertType } from "@api-client";
import { ForecastMonthDocument } from "@/lib/graphql/forecast";
import { buildForecastCsv } from "./csv";

// ── mocks ─────────────────────────────────────────────────────────────────────

vi.mock("next/navigation", () => ({
  useSearchParams: vi.fn(() => new URLSearchParams("m=6&y=2026")),
  useRouter: vi.fn(() => ({ push: vi.fn() })),
}));

vi.mock("next/link", () => ({
  default: ({
    children,
    href,
  }: {
    children: React.ReactNode;
    href: string;
  }) => <a href={href}>{children}</a>,
}));

vi.mock("recharts", () => ({
  ResponsiveContainer: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
  LineChart: ({
    children,
    data,
  }: {
    children: React.ReactNode;
    data: unknown[];
  }) => (
    <div data-testid="line-chart" data-rows={data?.length ?? 0}>
      {children}
    </div>
  ),
  Line: ({ dataKey, name }: { dataKey?: string; name?: string }) => (
    <div data-testid={`line-${dataKey}`} data-name={name} />
  ),
  XAxis: () => null,
  YAxis: () => null,
  CartesianGrid: () => null,
  Tooltip: () => null,
  Legend: () => null,
}));

vi.mock("sonner", () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}));

afterEach(() => vi.clearAllMocks());

// ── helpers ───────────────────────────────────────────────────────────────────

function wrap(mocks: MockedResponse[] = []) {
  function TestWrapper({ children }: { children: React.ReactNode }) {
    return (
      <MockedProvider mocks={mocks}>
        <TooltipProvider>{children}</TooltipProvider>
      </MockedProvider>
    );
  }
  return TestWrapper;
}

const mockDays = [
  {
    __typename: "ForecastDay" as const,
    date: "2026-06-01",
    inflow: 50000,
    outflow: -20000,
    net: 30000,
    runningBalance: 80000,
  },
  {
    __typename: "ForecastDay" as const,
    date: "2026-06-15",
    inflow: 0,
    outflow: -5000,
    net: -5000,
    runningBalance: 75000,
  },
];

const mockAlerts = [
  {
    __typename: "ForecastAlert" as const,
    date: "2026-06-28",
    type: AlertType.LowBalance,
    message: "Balance falls below ₹1,000",
    severity: AlertSeverity.Warning,
  },
];

function forecastMock(
  options: Record<string, number> = {
    lowBalanceThreshold: 1000,
    largeExpenseThreshold: 5000,
  }
): MockedResponse {
  return {
    request: {
      query: ForecastMonthDocument,
      variables: { year: 2026, month: 6, options },
    },
    result: {
      data: {
        forecastMonth: {
          __typename: "ForecastResult",
          month: 6,
          year: 2026,
          startingBalance: 50000,
          endingBalance: 75000,
          days: mockDays,
          alerts: mockAlerts,
        },
      },
    },
  };
}

// ── component import (after mocks) ────────────────────────────────────────────

import ForecastPage from "./page";

// ── tests ─────────────────────────────────────────────────────────────────────

describe("ForecastPage — chart renders with mock data", () => {
  it("shows the line chart after query resolves", async () => {
    render(<ForecastPage />, { wrapper: wrap([forecastMock()]) });

    await waitFor(() => {
      expect(screen.getByTestId("forecast-chart")).toBeDefined();
    });
  });

  it("renders inflow, outflow, and balance lines", async () => {
    render(<ForecastPage />, { wrapper: wrap([forecastMock()]) });

    await waitFor(() => {
      expect(screen.getByTestId("line-inflow")).toBeDefined();
      expect(screen.getByTestId("line-outflow")).toBeDefined();
      expect(screen.getByTestId("line-runningBalance")).toBeDefined();
    });
  });

  it("passes correct number of data rows to LineChart", async () => {
    render(<ForecastPage />, { wrapper: wrap([forecastMock()]) });

    await waitFor(() => {
      const chart = screen.getByTestId("line-chart");
      expect(chart.getAttribute("data-rows")).toBe(String(mockDays.length));
    });
  });

  it("shows the summary bar with starting and ending balance", async () => {
    render(<ForecastPage />, { wrapper: wrap([forecastMock()]) });

    await waitFor(() => {
      expect(screen.getByText("Starting balance")).toBeDefined();
      expect(screen.getByText("Ending balance")).toBeDefined();
    });
  });

  it("shows alert cards below the chart", async () => {
    render(<ForecastPage />, { wrapper: wrap([forecastMock()]) });

    await waitFor(() => {
      expect(screen.getByText("Balance falls below ₹1,000")).toBeDefined();
    });
  });

  it("shows spinner while loading", () => {
    render(<ForecastPage />, { wrapper: wrap([forecastMock()]) });
    expect(screen.getByLabelText("Loading forecast")).toBeDefined();
  });

  it("shows Export CSV button when data is available", async () => {
    render(<ForecastPage />, { wrapper: wrap([forecastMock()]) });

    await waitFor(() => {
      expect(
        screen.getByRole("button", { name: /export forecast as csv/i })
      ).toBeDefined();
    });
  });
});

describe("ForecastPage — CSV export produces correct rows", () => {
  it("header row contains correct columns", () => {
    const csv = buildForecastCsv(mockDays);
    const lines = csv.split("\n");
    expect(lines[0]).toBe("date,inflow,outflow,net,runningBalance");
  });

  it("each data row maps date, inflow, outflow, net, runningBalance", () => {
    const csv = buildForecastCsv(mockDays);
    const lines = csv.split("\n");
    expect(lines[1]).toBe("2026-06-01,50000,-20000,30000,80000");
    expect(lines[2]).toBe("2026-06-15,0,-5000,-5000,75000");
  });

  it("handles null runningBalance as empty string", () => {
    const days = [
      {
        __typename: "ForecastDay" as const,
        date: "2026-06-01",
        inflow: 1000,
        outflow: -500,
        net: 500,
        runningBalance: null as unknown as number,
      },
    ];
    const csv = buildForecastCsv(days);
    const lines = csv.split("\n");
    expect(lines[1]).toBe("2026-06-01,1000,-500,500,");
  });

  it("produces the correct number of lines (header + one per day)", () => {
    const csv = buildForecastCsv(mockDays);
    expect(csv.split("\n").length).toBe(mockDays.length + 1);
  });
});
