import { describe, it, expect } from "vitest";
import { render } from "@testing-library/react";
import { SegmentationCard } from "./segmentation-card";

const segments = [
  {
    segment: "NEEDS" as const,
    actual: 40000,
    percentOfIncome: 40,
    targetPercent: 50,
    targetAmount: 50000,
    variance: -10000,
    status: "BELOW_TARGET" as const,
  },
  {
    segment: "WANTS" as const,
    actual: 35000,
    percentOfIncome: 35,
    targetPercent: 30,
    targetAmount: 30000,
    variance: 5000,
    status: "ABOVE_TARGET" as const,
  },
  {
    segment: "SAVINGS" as const,
    actual: 25000,
    percentOfIncome: 25,
    targetPercent: 20,
    targetAmount: 20000,
    variance: 5000,
    status: "ABOVE_TARGET" as const,
  },
];

const renderCard = (
  overrides: Partial<Parameters<typeof SegmentationCard>[0]> = {}
) =>
  render(
    <SegmentationCard
      totalIncome={100000}
      segments={segments}
      unsegmentedExpenses={0}
      unclassified={0}
      {...overrides}
    />
  );

describe("SegmentationCard", () => {
  it("renders a row per segment with its status", () => {
    const { getByTestId } = renderCard();

    expect(getByTestId("segment-needs").textContent).toContain("Below target");
    expect(getByTestId("segment-wants").textContent).toContain("Above target");
    expect(getByTestId("segment-savings").textContent).toContain(
      "Above target"
    );
  });

  it("exposes each share as an accessible progress bar", () => {
    const { getAllByRole } = renderCard();
    const bars = getAllByRole("progressbar");

    expect(bars).toHaveLength(3);
    expect(bars[0].getAttribute("aria-valuenow")).toBe("40");
    expect(bars[0].getAttribute("aria-label")).toBe("Needs share of income");
  });

  it("caps the bar at 100% when spend exceeds income", () => {
    const { getAllByRole } = renderCard({
      segments: [{ ...segments[0], percentOfIncome: 140 }],
    });
    expect(getAllByRole("progressbar")[0].getAttribute("aria-valuenow")).toBe(
      "100"
    );
  });

  it("explains when there is no income", () => {
    const { getByTestId } = renderCard({ totalIncome: 0 });
    expect(getByTestId("segmentation-no-income")).toBeDefined();
  });

  it("flags spend left out of the shares", () => {
    const { getByTestId, queryByTestId } = renderCard({
      unsegmentedExpenses: 700,
      unclassified: 300,
    });
    expect(getByTestId("segmentation-uncategorised").textContent).toContain(
      "1,000"
    );
    expect(queryByTestId("segmentation-no-income")).toBeNull();
  });
});
