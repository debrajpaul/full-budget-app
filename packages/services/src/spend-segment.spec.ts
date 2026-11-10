import {
  BUDGET_RULE_PRESETS,
  EBaseCategories,
  ESegmentStatus,
  ESpendSegment,
  ESubExpenseCategories,
  ICategorySpend,
} from "@app/common";
import {
  assertValidRule,
  buildSegmentation,
  segmentOfExpense,
} from "./spend-segment";

const period = { month: 5, year: 2026 };

const makeSpend = (
  overrides: Partial<ICategorySpend> = {}
): ICategorySpend => ({
  category: EBaseCategories.expenses,
  subCategory: ESubExpenseCategories.housing,
  net: -1000,
  ...overrides,
});

const findSegment = (
  result: ReturnType<typeof buildSegmentation>,
  segment: ESpendSegment
) => result.segments.find((s) => s.segment === segment)!;

describe("segmentOfExpense", () => {
  it.each([
    [ESubExpenseCategories.housing, ESpendSegment.needs],
    [ESubExpenseCategories.food, ESpendSegment.needs],
    [ESubExpenseCategories.healthcare, ESpendSegment.needs],
    [ESubExpenseCategories.dining, ESpendSegment.wants],
    [ESubExpenseCategories.shopping, ESpendSegment.wants],
    [ESubExpenseCategories.subscriptions, ESpendSegment.wants],
  ])("places %s in %s", (subCategory, expected) => {
    expect(segmentOfExpense(subCategory)).toBe(expected);
  });

  it("returns undefined for a missing or unknown sub-category", () => {
    expect(segmentOfExpense(undefined)).toBeUndefined();
    expect(segmentOfExpense("SOMETHING_NEW")).toBeUndefined();
  });
});

describe("assertValidRule", () => {
  it("accepts every preset", () => {
    Object.values(BUDGET_RULE_PRESETS).forEach((rule) =>
      expect(() => assertValidRule(rule)).not.toThrow()
    );
  });

  it("rejects a rule that does not sum to 100", () => {
    expect(() =>
      assertValidRule({ needs: 50, wants: 30, savings: 30 })
    ).toThrow("sum to 100");
  });

  it("rejects negative percentages", () => {
    expect(() =>
      assertValidRule({ needs: 110, wants: -10, savings: 0 })
    ).toThrow("non-negative");
  });
});

describe("buildSegmentation", () => {
  const rule = BUDGET_RULE_PRESETS.rule503020;

  it("splits spend into needs, wants and savings against a 50/30/20 rule", () => {
    const result = buildSegmentation(
      [
        makeSpend({
          category: EBaseCategories.income,
          subCategory: undefined,
          net: 100000,
        }),
        makeSpend({ subCategory: ESubExpenseCategories.housing, net: -40000 }),
        makeSpend({ subCategory: ESubExpenseCategories.dining, net: -35000 }),
        makeSpend({
          category: EBaseCategories.investment,
          subCategory: undefined,
          net: -15000,
        }),
      ],
      rule,
      period
    );

    expect(result.totalIncome).toBe(100000);
    expect(findSegment(result, ESpendSegment.needs)).toMatchObject({
      actual: 40000,
      percentOfIncome: 40,
      targetAmount: 50000,
      variance: -10000,
      status: ESegmentStatus.belowTarget,
    });
    expect(findSegment(result, ESpendSegment.wants)).toMatchObject({
      actual: 35000,
      variance: 5000,
      status: ESegmentStatus.aboveTarget,
    });
    expect(findSegment(result, ESpendSegment.savings)).toMatchObject({
      actual: 15000,
      status: ESegmentStatus.belowTarget,
    });
  });

  it("counts loan payments as needs", () => {
    const result = buildSegmentation(
      [
        makeSpend({
          category: EBaseCategories.income,
          subCategory: undefined,
          net: 50000,
        }),
        makeSpend({
          category: EBaseCategories.loan,
          subCategory: undefined,
          net: -25000,
        }),
      ],
      rule,
      period
    );
    expect(findSegment(result, ESpendSegment.needs).actual).toBe(25000);
    expect(findSegment(result, ESpendSegment.needs).status).toBe(
      ESegmentStatus.onTarget
    );
  });

  it("nets refunds against spend in the same segment", () => {
    const result = buildSegmentation(
      [
        makeSpend({
          category: EBaseCategories.income,
          subCategory: undefined,
          net: 10000,
        }),
        makeSpend({ subCategory: ESubExpenseCategories.shopping, net: -1500 }),
      ],
      rule,
      period
    );
    expect(findSegment(result, ESpendSegment.wants).actual).toBe(1500);
  });

  it("reports expenses without a sub-category separately", () => {
    const result = buildSegmentation(
      [makeSpend({ subCategory: undefined, net: -700 })],
      rule,
      period
    );
    expect(result.unsegmentedExpenses).toBe(700);
    expect(findSegment(result, ESpendSegment.needs).actual).toBe(0);
  });

  it("reports unclassified spend and ignores transfers", () => {
    const result = buildSegmentation(
      [
        makeSpend({
          category: EBaseCategories.unclassified,
          subCategory: undefined,
          net: -300,
        }),
        makeSpend({
          category: EBaseCategories.transfer,
          subCategory: undefined,
          net: -9999,
        }),
      ],
      rule,
      period
    );
    expect(result.unclassified).toBe(300);
    expect(result.segments.every((s) => s.actual === 0)).toBe(true);
  });

  it("flags spend as above target when there is no income", () => {
    const result = buildSegmentation(
      [makeSpend({ subCategory: ESubExpenseCategories.food, net: -500 })],
      rule,
      period
    );
    expect(result.totalIncome).toBe(0);
    expect(findSegment(result, ESpendSegment.needs)).toMatchObject({
      percentOfIncome: 0,
      targetAmount: 0,
      variance: 500,
      status: ESegmentStatus.aboveTarget,
    });
    expect(findSegment(result, ESpendSegment.wants).status).toBe(
      ESegmentStatus.onTarget
    );
  });

  it("treats results within one percentage point as on target", () => {
    const result = buildSegmentation(
      [
        makeSpend({
          category: EBaseCategories.income,
          subCategory: undefined,
          net: 100000,
        }),
        makeSpend({ subCategory: ESubExpenseCategories.housing, net: -50900 }),
      ],
      rule,
      period
    );
    expect(findSegment(result, ESpendSegment.needs).status).toBe(
      ESegmentStatus.onTarget
    );
  });

  it("returns all three segments for an empty month", () => {
    const result = buildSegmentation([], rule, period);
    expect(result.segments.map((s) => s.segment)).toEqual([
      ESpendSegment.needs,
      ESpendSegment.wants,
      ESpendSegment.savings,
    ]);
    expect(result).toMatchObject({ ...period, totalIncome: 0 });
  });

  it("rejects an invalid rule before computing", () => {
    expect(() =>
      buildSegmentation([], { needs: 10, wants: 10, savings: 10 }, period)
    ).toThrow("sum to 100");
  });
});
