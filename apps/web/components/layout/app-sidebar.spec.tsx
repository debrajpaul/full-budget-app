import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { MockedProvider } from "@apollo/client/testing";

// ── mocks (hoisted before imports) ────────────────────────────────────────────

vi.mock("next/navigation", () => ({
  usePathname: vi.fn(() => "/dashboard"),
  useRouter: vi.fn(() => ({ push: vi.fn(), refresh: vi.fn() })),
}));

// ── component imports ──────────────────────────────────────────────────────────

import { TooltipProvider } from "@/components/ui/tooltip";
import { SidebarProvider } from "@/components/ui/sidebar";
import { AppSidebar, NAV_ITEMS } from "./app-sidebar";

// ── helpers ────────────────────────────────────────────────────────────────────

// SidebarMenuButton renders Tooltip internally (for icon-only mode).
// TooltipProvider + SidebarProvider must wrap the component under test.
// MockedProvider satisfies any Apollo context required by future children.
function Wrapper({ children }: { children: React.ReactNode }) {
  return (
    <MockedProvider mocks={[]}>
      <TooltipProvider>
        <SidebarProvider>{children}</SidebarProvider>
      </TooltipProvider>
    </MockedProvider>
  );
}

// ── tests ──────────────────────────────────────────────────────────────────────

describe("AppSidebar", () => {
  it("renders all navigation items", () => {
    render(<AppSidebar />, { wrapper: Wrapper });

    for (const { label } of NAV_ITEMS) {
      expect(screen.getByText(label)).toBeDefined();
    }
  });

  it("marks unbuilt items as aria-disabled and built items as links", () => {
    render(<AppSidebar />, { wrapper: Wrapper });

    const expectedDisabled = NAV_ITEMS.filter((i) => !i.built).length;
    const expectedLinks = NAV_ITEMS.filter((i) => i.built).length;

    const disabledButtons = screen
      .queryAllByRole("button")
      .filter((el) => el.getAttribute("aria-disabled") === "true");

    const navLinks = screen.getAllByRole("link");

    expect(disabledButtons.length).toBe(expectedDisabled);
    expect(navLinks.length).toBe(expectedLinks);
  });

  it("shows the app name in the header", () => {
    render(<AppSidebar />, { wrapper: Wrapper });
    expect(screen.getByText("full-budget")).toBeDefined();
  });

  it("renders the active route (Dashboard) as a link when built", () => {
    // usePathname is mocked to '/dashboard'; Dashboard has built: true
    // so it renders as an <a> link, not a disabled button.
    render(<AppSidebar />, { wrapper: Wrapper });

    const dashboardLink = screen
      .getAllByRole("link")
      .find((el) => el.textContent?.includes("Dashboard"));

    expect(dashboardLink).toBeDefined();
  });
});
