import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MockedProvider } from "@apollo/client/testing";
import type { MockedResponse } from "@apollo/client/testing";
import { TooltipProvider } from "@/components/ui/tooltip";
import { BudgetsDocument, SetBudgetDocument } from "@/lib/graphql/budgets";
import { BudgetsView } from "@/components/budgets/budgets-view";

vi.mock("sonner", () => ({
  toast: { success: vi.fn(), error: vi.fn(), warning: vi.fn() },
}));

import { toast } from "sonner";

afterEach(() => vi.clearAllMocks());

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

const period = { month: 6, year: 2026 };

const mockBudget = {
  __typename: "Budget" as const,
  id: "b-1",
  month: 6,
  year: 2026,
  category: "Housing",
  amount: 15000,
};

const mockBudget2 = {
  __typename: "Budget" as const,
  id: "b-2",
  month: 6,
  year: 2026,
  category: "Food",
  amount: 5000,
};

function queryStub(items: (typeof mockBudget)[] = []): MockedResponse {
  return {
    request: {
      query: BudgetsDocument,
      variables: { period: { month: period.month, year: period.year } },
    },
    result: { data: { budgets: items } },
  };
}

describe("BudgetsView — table renders", () => {
  it("shows category names from initialBudgets", () => {
    render(
      <BudgetsView
        initialBudgets={[mockBudget, mockBudget2]}
        categoryBreakdown={[]}
        period={period}
      />,
      { wrapper: wrap([queryStub([mockBudget, mockBudget2])]) }
    );
    expect(screen.getByText("Housing")).toBeDefined();
    expect(screen.getByText("Food")).toBeDefined();
  });

  it("renders budgeted amounts as clickable cells", () => {
    render(
      <BudgetsView
        initialBudgets={[mockBudget]}
        categoryBreakdown={[]}
        period={period}
      />,
      { wrapper: wrap([queryStub([mockBudget])]) }
    );
    expect(
      screen.getByRole("button", { name: /edit budget for housing/i })
    ).toBeDefined();
  });

  it("shows actual spend from categoryBreakdown", () => {
    render(
      <BudgetsView
        initialBudgets={[mockBudget]}
        categoryBreakdown={[{ name: "Housing", amount: 8000 }]}
        period={period}
      />,
      { wrapper: wrap([queryStub([mockBudget])]) }
    );
    // formatCurrency(8000) should appear in actual column
    expect(screen.getAllByText(/₹/).length).toBeGreaterThan(0);
  });

  it("shows progress bars for each budget row", () => {
    render(
      <BudgetsView
        initialBudgets={[mockBudget]}
        categoryBreakdown={[{ name: "Housing", amount: 8000 }]}
        period={period}
      />,
      { wrapper: wrap([queryStub([mockBudget])]) }
    );
    expect(screen.getByRole("progressbar")).toBeDefined();
  });

  it("shows empty state when no budgets", () => {
    render(
      <BudgetsView
        initialBudgets={[]}
        categoryBreakdown={[]}
        period={period}
      />,
      { wrapper: wrap([queryStub()]) }
    );
    expect(screen.getByText(/no budget categories yet/i)).toBeDefined();
  });

  it("renders Add category button", () => {
    render(
      <BudgetsView
        initialBudgets={[]}
        categoryBreakdown={[]}
        period={period}
      />,
      { wrapper: wrap([queryStub()]) }
    );
    expect(screen.getByRole("button", { name: /add category/i })).toBeDefined();
  });
});

describe("BudgetsView — inline edit calls setBudget mutation", () => {
  it("clicking budgeted cell shows input, blur commits setBudget mutation", async () => {
    const user = userEvent.setup();

    const mocks: MockedResponse[] = [
      queryStub([mockBudget]),
      {
        request: {
          query: SetBudgetDocument,
          variables: {
            period: { month: period.month, year: period.year },
            category: "Housing",
            amount: 20000,
          },
        },
        result: {
          data: {
            setBudget: { ...mockBudget, amount: 20000 },
          },
        },
      },
    ];

    render(
      <BudgetsView
        initialBudgets={[mockBudget]}
        categoryBreakdown={[]}
        period={period}
      />,
      { wrapper: wrap(mocks) }
    );

    // Click the budgeted cell to enter edit mode
    await user.click(
      screen.getByRole("button", { name: /edit budget for housing/i })
    );

    // Input should be visible
    const input = screen.getByRole("spinbutton");
    expect(input).toBeDefined();

    // Clear and type new value
    await user.clear(input);
    await user.type(input, "20000");

    // Blur to commit
    await user.tab();

    await waitFor(() => {
      expect(toast.success).toHaveBeenCalledWith("Budget updated");
    });
  });

  it("pressing Escape cancels edit without mutation", async () => {
    const user = userEvent.setup();

    render(
      <BudgetsView
        initialBudgets={[mockBudget]}
        categoryBreakdown={[]}
        period={period}
      />,
      { wrapper: wrap([queryStub([mockBudget])]) }
    );

    await user.click(
      screen.getByRole("button", { name: /edit budget for housing/i })
    );

    const input = screen.getByRole("spinbutton");
    await user.clear(input);
    await user.type(input, "99999");
    await user.keyboard("{Escape}");

    // No mutation fired — toast should not be called
    expect(toast.success).not.toHaveBeenCalled();
    // Input should be gone
    expect(screen.queryByRole("spinbutton")).toBeNull();
  });
});
