import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MockedProvider } from "@apollo/client/testing";
import type { MockedResponse } from "@apollo/client/testing";
import { TooltipProvider } from "@/components/ui/tooltip";
import { RecurringFrequency, TransactionType } from "@api-client";
import {
  GenerateRecurringDocument,
  RecurringTransactionsDocument,
} from "@/lib/graphql/recurring";

vi.mock("next/navigation", () => ({
  useRouter: vi.fn(() => ({ push: vi.fn() })),
}));

vi.mock("sonner", () => ({
  toast: { success: vi.fn(), error: vi.fn(), warning: vi.fn() },
}));

import { toast } from "sonner";
import { RecurringView } from "@/components/recurring/recurring-view";

afterEach(() => vi.clearAllMocks());

// Named inner function satisfies react/display-name
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

const mockItem = {
  __typename: "RecurringTransaction" as const,
  id: "rx-1",
  description: "Monthly Rent",
  amount: 10000,
  category: "Housing",
  type: TransactionType.Expense,
  frequency: RecurringFrequency.Monthly,
  dayOfMonth: 1,
  startDate: "2025-01-01",
  nextRunDate: "2026-06-01",
};

// Stub for the background useQuery fired by RecurringView on mount.
// Without this, Apollo logs "no more mocked responses" warnings.
function queryStub(items: (typeof mockItem)[] = []): MockedResponse {
  return {
    request: { query: RecurringTransactionsDocument },
    result: { data: { recurringTransactions: items } },
  };
}

describe("RecurringView — list renders", () => {
  it("shows item description and amount from initialItems", () => {
    render(<RecurringView initialItems={[mockItem]} />, {
      wrapper: wrap([queryStub([mockItem])]),
    });
    expect(screen.getByText("Monthly Rent")).toBeDefined();
    expect(screen.getAllByText(/₹/).length).toBeGreaterThan(0);
  });

  it("shows frequency badge", () => {
    render(<RecurringView initialItems={[mockItem]} />, {
      wrapper: wrap([queryStub([mockItem])]),
    });
    expect(screen.getByText("Monthly")).toBeDefined();
  });

  it("shows Expense type badge", () => {
    render(<RecurringView initialItems={[mockItem]} />, {
      wrapper: wrap([queryStub([mockItem])]),
    });
    expect(screen.getByText("Expense")).toBeDefined();
  });

  it("shows day-of-month annotation for monthly items", () => {
    render(<RecurringView initialItems={[mockItem]} />, {
      wrapper: wrap([queryStub([mockItem])]),
    });
    expect(screen.getByText(/day 1 of month/i)).toBeDefined();
  });

  it("shows empty state when no items", () => {
    render(<RecurringView initialItems={[]} />, {
      wrapper: wrap([queryStub()]),
    });
    expect(screen.getByText(/no recurring transactions yet/i)).toBeDefined();
  });

  it("renders Generate and Add recurring buttons", () => {
    render(<RecurringView initialItems={[]} />, {
      wrapper: wrap([queryStub()]),
    });
    expect(
      screen.getByRole("button", { name: /generate for this month/i })
    ).toBeDefined();
    expect(
      screen.getAllByRole("button", { name: /add recurring/i }).length
    ).toBeGreaterThan(0);
  });
});

describe("RecurringView — generate mutation", () => {
  it("calls generateRecurringTransactions and shows count in toast", async () => {
    const user = userEvent.setup();
    const now = new Date();
    const month = now.getMonth() + 1;
    const year = now.getFullYear();

    const mocks: MockedResponse[] = [
      queryStub(),
      {
        request: {
          query: GenerateRecurringDocument,
          variables: { month, year },
        },
        result: { data: { generateRecurringTransactions: 3 } },
      },
    ];

    render(<RecurringView initialItems={[]} />, { wrapper: wrap(mocks) });

    await user.click(
      screen.getByRole("button", { name: /generate for this month/i })
    );

    await waitFor(() => {
      expect(toast.success).toHaveBeenCalledWith(expect.stringContaining("3"));
    });
  });
});
