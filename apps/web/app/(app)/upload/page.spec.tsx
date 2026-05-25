import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { MockedProvider } from "@apollo/client/testing";
import { TooltipProvider } from "@/components/ui/tooltip";

vi.mock("next/navigation", () => ({
  useRouter: vi.fn(() => ({ push: vi.fn() })),
}));

vi.mock("sonner", () => ({
  toast: { success: vi.fn(), error: vi.fn(), warning: vi.fn() },
}));

import UploadPage from "./page";

function Wrapper({ children }: { children: React.ReactNode }) {
  return (
    <MockedProvider mocks={[]}>
      <TooltipProvider>{children}</TooltipProvider>
    </MockedProvider>
  );
}

describe("UploadPage", () => {
  it("renders the page heading and description", () => {
    render(<UploadPage />, { wrapper: Wrapper });
    expect(screen.getByText("Upload Statement")).toBeDefined();
    expect(screen.getByText(/import a bank statement/i)).toBeDefined();
  });

  it("renders form labels for bank, account type, and file", () => {
    render(<UploadPage />, { wrapper: Wrapper });
    expect(screen.getByText("Bank")).toBeDefined();
    expect(screen.getByText("Account type")).toBeDefined();
    expect(screen.getByText("Statement file")).toBeDefined();
  });

  it("renders the upload button enabled in idle state", () => {
    render(<UploadPage />, { wrapper: Wrapper });
    const btn = screen.getByRole("button", { name: /upload/i });
    expect(btn).toBeDefined();
    expect((btn as HTMLButtonElement).disabled).toBe(false);
  });

  it("renders bank and account type select placeholders", () => {
    render(<UploadPage />, { wrapper: Wrapper });
    expect(screen.getByText("Select bank…")).toBeDefined();
    expect(screen.getByText("Select account type…")).toBeDefined();
  });

  it("renders the file picker trigger", () => {
    render(<UploadPage />, { wrapper: Wrapper });
    expect(screen.getByRole("button", { name: "Choose file" })).toBeDefined();
    expect(screen.getByText(/choose .csv/i)).toBeDefined();
  });

  it("does not show progress bar or warnings initially", () => {
    render(<UploadPage />, { wrapper: Wrapper });
    expect(screen.queryByRole("progressbar")).toBeNull();
    expect(screen.queryByText("Warnings")).toBeNull();
  });
});
