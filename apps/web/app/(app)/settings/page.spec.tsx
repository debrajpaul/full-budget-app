import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { SettingsView } from "@/components/settings/settings-view";

// ── mocks ─────────────────────────────────────────────────────────────────────

const mockPush = vi.fn();
const mockRefresh = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: mockPush, refresh: mockRefresh }),
}));

const mockSetTheme = vi.fn();

vi.mock("next-themes", () => ({
  useTheme: () => ({ theme: "system", setTheme: mockSetTheme }),
}));

afterEach(() => vi.clearAllMocks());

// ── helpers ───────────────────────────────────────────────────────────────────

const defaultUser = {
  email: "alice@example.com",
  tenantId: "tenant-default",
  userId: "usr_abcdefghij1234567890",
};

function renderView(overrides: Partial<typeof defaultUser> = {}) {
  return render(<SettingsView user={{ ...defaultUser, ...overrides }} />);
}

// ── Profile section ───────────────────────────────────────────────────────────

describe("Profile section", () => {
  it("renders email", () => {
    renderView();
    expect(screen.getByTestId("profile-email").textContent).toBe(
      "alice@example.com"
    );
  });

  it("renders tenantId badge", () => {
    renderView();
    expect(screen.getByTestId("profile-tenant").textContent).toBe(
      "tenant-default"
    );
  });

  it("truncates long userId", () => {
    renderView({ userId: "usr_abcdefghij1234567890" });
    const text = screen.getByTestId("profile-user-id").textContent ?? "";
    expect(text).toContain("…");
    expect(text.length).toBeLessThan("usr_abcdefghij1234567890".length);
  });

  it("shows short userId without truncation", () => {
    renderView({ userId: "short-id" });
    expect(screen.getByTestId("profile-user-id").textContent).toBe("short-id");
  });

  it("shows dashes when fields are empty", () => {
    renderView({ email: "", tenantId: "", userId: "" });
    expect(screen.getByTestId("profile-email").textContent).toBe("—");
    expect(screen.getByTestId("profile-tenant").textContent).toBe("—");
    expect(screen.getByTestId("profile-user-id").textContent).toBe("—");
  });
});

// ── Appearance section ────────────────────────────────────────────────────────

describe("Appearance section", () => {
  it("renders Light, Dark, and System buttons", () => {
    renderView();
    expect(screen.getByTestId("theme-light")).toBeDefined();
    expect(screen.getByTestId("theme-dark")).toBeDefined();
    expect(screen.getByTestId("theme-system")).toBeDefined();
  });

  it("marks the active theme with aria-pressed=true", () => {
    renderView();
    // mock returns theme: 'system'
    expect(
      screen.getByTestId("theme-system").getAttribute("aria-pressed")
    ).toBe("true");
    expect(screen.getByTestId("theme-light").getAttribute("aria-pressed")).toBe(
      "false"
    );
  });

  it("calls setTheme when a theme button is clicked", async () => {
    const user = userEvent.setup();
    renderView();
    await user.click(screen.getByTestId("theme-dark"));
    expect(mockSetTheme).toHaveBeenCalledWith("dark");
  });
});

// ── Danger zone ───────────────────────────────────────────────────────────────

describe("Danger zone", () => {
  beforeEach(() => {
    global.fetch = vi.fn().mockResolvedValue({ ok: true } as Response);
  });

  it("sign out button is present and enabled", () => {
    renderView();
    const btn = screen.getByTestId("sign-out-btn");
    expect(btn).toBeDefined();
    expect((btn as HTMLButtonElement).disabled).toBe(false);
  });

  it("clicking sign out posts to /api/auth/logout and redirects", async () => {
    const user = userEvent.setup();
    renderView();
    await user.click(screen.getByTestId("sign-out-btn"));
    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith("/api/auth/logout", {
        method: "POST",
        redirect: "manual",
      });
      expect(mockPush).toHaveBeenCalledWith("/login");
    });
  });

  it("delete account button is disabled", () => {
    renderView();
    const btn = screen.getByRole("button", { name: /coming soon/i });
    expect((btn as HTMLButtonElement).disabled).toBe(true);
  });
});
