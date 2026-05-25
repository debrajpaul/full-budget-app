import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MockedProvider } from "@apollo/client/testing";
import type { MockedResponse } from "@apollo/client/testing";
import { TooltipProvider } from "@/components/ui/tooltip";
import {
  SinkingFundsDocument,
  ContributeSinkingFundDocument,
} from "@/lib/graphql/sinking-funds";
import { SinkingFundsView } from "@/components/sinking-funds/sinking-funds-view";

// ── mocks ─────────────────────────────────────────────────────────────────────

vi.mock("next/navigation", () => ({
  useRouter: vi.fn(() => ({ push: vi.fn() })),
}));

vi.mock("recharts", () => ({
  ResponsiveContainer: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
  LineChart: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="sparkline-chart">{children}</div>
  ),
  Line: () => null,
}));

vi.mock("sonner", () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}));

import { toast } from "sonner";

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

const mockFund = {
  __typename: "SinkingFund" as const,
  id: "fund-1",
  name: "Car Replacement",
  target: 500000,
  current: 120000,
  monthlyContribution: 10000,
  deadline: "2029-06-30",
  history: [
    {
      __typename: "SinkingFundHistoryPoint" as const,
      date: "2026-01-01",
      value: 0,
    },
    {
      __typename: "SinkingFundHistoryPoint" as const,
      date: "2026-03-01",
      value: 60000,
    },
    {
      __typename: "SinkingFundHistoryPoint" as const,
      date: "2026-05-01",
      value: 120000,
    },
  ],
};

function queryStub(funds: (typeof mockFund)[] = []): MockedResponse {
  return {
    request: { query: SinkingFundsDocument },
    result: { data: { sinkingFunds: funds } },
  };
}

// ── tests ─────────────────────────────────────────────────────────────────────

describe("SinkingFundsView — card renders with mock fund", () => {
  it("shows fund name", () => {
    render(<SinkingFundsView initialFunds={[mockFund]} />, {
      wrapper: wrap([queryStub([mockFund])]),
    });
    expect(screen.getByText("Car Replacement")).toBeDefined();
  });

  it("shows deadline", () => {
    render(<SinkingFundsView initialFunds={[mockFund]} />, {
      wrapper: wrap([queryStub([mockFund])]),
    });
    expect(screen.getByText(/2029/)).toBeDefined();
  });

  it("shows monthly contribution", () => {
    render(<SinkingFundsView initialFunds={[mockFund]} />, {
      wrapper: wrap([queryStub([mockFund])]),
    });
    expect(screen.getByText(/\/mo/)).toBeDefined();
  });

  it("shows current and target amounts", () => {
    render(<SinkingFundsView initialFunds={[mockFund]} />, {
      wrapper: wrap([queryStub([mockFund])]),
    });
    expect(screen.getAllByText(/₹/).length).toBeGreaterThan(0);
  });

  it("shows progress bar", () => {
    render(<SinkingFundsView initialFunds={[mockFund]} />, {
      wrapper: wrap([queryStub([mockFund])]),
    });
    expect(screen.getByRole("progressbar")).toBeDefined();
  });

  it("shows progress percentage (24%)", () => {
    render(<SinkingFundsView initialFunds={[mockFund]} />, {
      wrapper: wrap([queryStub([mockFund])]),
    });
    expect(screen.getByText("24%")).toBeDefined();
  });

  it("shows months remaining when deadline is set", () => {
    render(<SinkingFundsView initialFunds={[mockFund]} />, {
      wrapper: wrap([queryStub([mockFund])]),
    });
    expect(screen.getByTestId("months-remaining")).toBeDefined();
  });

  it("renders sparkline when history has ≥ 2 points", () => {
    render(<SinkingFundsView initialFunds={[mockFund]} />, {
      wrapper: wrap([queryStub([mockFund])]),
    });
    expect(screen.getByTestId("sparkline")).toBeDefined();
  });

  it("renders Contribute, Edit, Delete action buttons", () => {
    render(<SinkingFundsView initialFunds={[mockFund]} />, {
      wrapper: wrap([queryStub([mockFund])]),
    });
    expect(
      screen.getByRole("button", { name: /contribute to car replacement/i })
    ).toBeDefined();
    expect(
      screen.getByRole("button", { name: /edit car replacement/i })
    ).toBeDefined();
    expect(
      screen.getByRole("button", { name: /delete car replacement/i })
    ).toBeDefined();
  });

  it("shows empty state when no funds", () => {
    render(<SinkingFundsView initialFunds={[]} />, {
      wrapper: wrap([queryStub()]),
    });
    expect(screen.getByText(/no sinking funds yet/i)).toBeDefined();
  });

  it("shows New sinking fund button", () => {
    render(<SinkingFundsView initialFunds={[]} />, {
      wrapper: wrap([queryStub()]),
    });
    expect(
      screen.getByRole("button", { name: /new sinking fund/i })
    ).toBeDefined();
  });
});

describe("SinkingFundsView — contribute mutation called on form submit", () => {
  it("opens contribute sheet and calls contributeSinkingFund on submit", async () => {
    const user = userEvent.setup();

    const updatedFund = { ...mockFund, current: 130000 };
    const mocks: MockedResponse[] = [
      queryStub([mockFund]),
      {
        request: {
          query: ContributeSinkingFundDocument,
          variables: { input: { id: "fund-1", amount: 10000 } },
        },
        result: {
          data: {
            contributeSinkingFund: {
              ...mockFund,
              current: 130000,
              history: [
                ...mockFund.history,
                {
                  __typename: "SinkingFundHistoryPoint" as const,
                  date: "2026-06-01",
                  value: 130000,
                },
              ],
            },
          },
        },
      },
      queryStub([updatedFund]),
    ];

    render(<SinkingFundsView initialFunds={[mockFund]} />, {
      wrapper: wrap(mocks),
    });

    await user.click(
      screen.getByRole("button", { name: /contribute to car replacement/i })
    );

    const amountInput = screen.getByRole("spinbutton");
    await user.clear(amountInput);
    await user.type(amountInput, "10000");

    await user.click(screen.getByRole("button", { name: /add contribution/i }));

    await waitFor(() => {
      expect(toast.success).toHaveBeenCalledWith("Contribution added");
    });
  });

  it("shows delete confirmation dialog when Delete is clicked", async () => {
    const user = userEvent.setup();

    render(<SinkingFundsView initialFunds={[mockFund]} />, {
      wrapper: wrap([queryStub([mockFund])]),
    });

    await user.click(
      screen.getByRole("button", { name: /delete car replacement/i })
    );

    await waitFor(() => {
      expect(screen.getByText(/this action cannot be undone/i)).toBeDefined();
    });
  });
});

describe("SinkingFundsView — fund without optional fields", () => {
  const minimalFund = {
    __typename: "SinkingFund" as const,
    id: "fund-2",
    name: "Vacation",
    target: 80000,
    current: 20000,
    monthlyContribution: null,
    deadline: null,
    history: [
      {
        __typename: "SinkingFundHistoryPoint" as const,
        date: "2026-01-01",
        value: 0,
      },
      {
        __typename: "SinkingFundHistoryPoint" as const,
        date: "2026-04-01",
        value: 20000,
      },
    ],
  };

  it("renders without deadline or monthly contribution", () => {
    render(<SinkingFundsView initialFunds={[minimalFund]} />, {
      wrapper: wrap([
        {
          request: { query: SinkingFundsDocument },
          result: { data: { sinkingFunds: [minimalFund] } },
        },
      ]),
    });
    expect(screen.getByText("Vacation")).toBeDefined();
    expect(screen.queryByText(/\/mo/)).toBeNull();
    expect(screen.queryByTestId("months-remaining")).toBeNull();
  });
});
