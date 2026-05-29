import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MockedProvider } from "@apollo/client/testing";
import type { MockedResponse } from "@apollo/client/testing";
import { TooltipProvider } from "@/components/ui/tooltip";
import {
  SavingsGoalsDocument,
  ContributeGoalDocument,
} from "@/lib/graphql/goals";
import { GoalsView } from "@/components/goals/goals-view";

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

const mockGoal = {
  __typename: "SavingsGoal" as const,
  id: "goal-1",
  name: "Emergency Fund",
  target: 100000,
  current: 45000,
  deadline: "2026-12-31",
  history: [
    {
      __typename: "SavingsHistoryPoint" as const,
      date: "2026-01-01",
      value: 10000,
    },
    {
      __typename: "SavingsHistoryPoint" as const,
      date: "2026-03-01",
      value: 25000,
    },
    {
      __typename: "SavingsHistoryPoint" as const,
      date: "2026-05-01",
      value: 45000,
    },
  ],
};

function queryStub(goals: (typeof mockGoal)[] = []): MockedResponse {
  return {
    request: { query: SavingsGoalsDocument },
    result: { data: { savingsGoals: goals } },
  };
}

// ── tests ─────────────────────────────────────────────────────────────────────

describe("GoalsView — card renders with mock goal", () => {
  it("shows goal name", () => {
    render(<GoalsView initialGoals={[mockGoal]} />, {
      wrapper: wrap([queryStub([mockGoal])]),
    });
    expect(screen.getByText("Emergency Fund")).toBeDefined();
  });

  it("shows deadline", () => {
    render(<GoalsView initialGoals={[mockGoal]} />, {
      wrapper: wrap([queryStub([mockGoal])]),
    });
    expect(screen.getByText(/2026/)).toBeDefined();
  });

  it("shows current and target amounts", () => {
    render(<GoalsView initialGoals={[mockGoal]} />, {
      wrapper: wrap([queryStub([mockGoal])]),
    });
    expect(screen.getAllByText(/₹/).length).toBeGreaterThan(0);
  });

  it("shows progress bar", () => {
    render(<GoalsView initialGoals={[mockGoal]} />, {
      wrapper: wrap([queryStub([mockGoal])]),
    });
    expect(screen.getByRole("progressbar")).toBeDefined();
  });

  it("shows progress percentage (45%)", () => {
    render(<GoalsView initialGoals={[mockGoal]} />, {
      wrapper: wrap([queryStub([mockGoal])]),
    });
    expect(screen.getByText("45%")).toBeDefined();
  });

  it("renders sparkline when history has ≥ 2 points", () => {
    render(<GoalsView initialGoals={[mockGoal]} />, {
      wrapper: wrap([queryStub([mockGoal])]),
    });
    expect(screen.getByTestId("sparkline")).toBeDefined();
  });

  it("renders Contribute, Edit, Delete action buttons", () => {
    render(<GoalsView initialGoals={[mockGoal]} />, {
      wrapper: wrap([queryStub([mockGoal])]),
    });
    expect(
      screen.getByRole("button", { name: /contribute to emergency fund/i })
    ).toBeDefined();
    expect(
      screen.getByRole("button", { name: /edit emergency fund/i })
    ).toBeDefined();
    expect(
      screen.getByRole("button", { name: /delete emergency fund/i })
    ).toBeDefined();
  });

  it("shows empty state when no goals", () => {
    render(<GoalsView initialGoals={[]} />, {
      wrapper: wrap([queryStub()]),
    });
    expect(screen.getByText(/no savings goals yet/i)).toBeDefined();
  });

  it("shows New goal button", () => {
    render(<GoalsView initialGoals={[]} />, {
      wrapper: wrap([queryStub()]),
    });
    expect(screen.getByRole("button", { name: /new goal/i })).toBeDefined();
  });
});

describe("GoalsView — contribute mutation called on form submit", () => {
  it("opens contribute sheet and calls contributeSavingsGoal on submit", async () => {
    const user = userEvent.setup();

    const updatedGoal = { ...mockGoal, current: 50000 };
    const mocks: MockedResponse[] = [
      queryStub([mockGoal]),
      {
        request: {
          query: ContributeGoalDocument,
          variables: { input: { id: "goal-1", amount: 5000 } },
        },
        result: {
          data: {
            contributeSavingsGoal: {
              ...mockGoal,
              current: 50000,
              history: [
                ...mockGoal.history,
                {
                  __typename: "SavingsHistoryPoint" as const,
                  date: "2026-06-01",
                  value: 50000,
                },
              ],
            },
          },
        },
      },
      // refetch after successful contribution
      queryStub([updatedGoal]),
    ];

    render(<GoalsView initialGoals={[mockGoal]} />, {
      wrapper: wrap(mocks),
    });

    // Open the contribute sheet
    await user.click(
      screen.getByRole("button", { name: /contribute to emergency fund/i })
    );

    // Fill amount
    const amountInput = screen.getByRole("spinbutton");
    await user.clear(amountInput);
    await user.type(amountInput, "5000");

    // Submit
    await user.click(screen.getByRole("button", { name: /add contribution/i }));

    await waitFor(() => {
      expect(toast.success).toHaveBeenCalledWith("Contribution added");
    });
  });

  it("shows delete confirmation dialog when Delete is clicked", async () => {
    const user = userEvent.setup();

    render(<GoalsView initialGoals={[mockGoal]} />, {
      wrapper: wrap([queryStub([mockGoal])]),
    });

    await user.click(
      screen.getByRole("button", { name: /delete emergency fund/i })
    );

    await waitFor(() => {
      expect(screen.getByText(/this action cannot be undone/i)).toBeDefined();
    });
  });
});
