import {
  EBaseCategories,
  ESegmentStatus,
  ESpendSegment,
  ESubExpenseCategories,
  IBudgetRule,
  IBudgetSegmentation,
  ICategorySpend,
  ISegmentSummary,
  SEGMENT_TOLERANCE_PERCENT,
} from "@app/common";
import { CustomError } from "./custom-error";

const NEEDS_SUB_CATEGORIES: ReadonlySet<string> = new Set([
  ESubExpenseCategories.housing,
  ESubExpenseCategories.transportation,
  ESubExpenseCategories.food,
  ESubExpenseCategories.utilities,
  ESubExpenseCategories.healthcare,
]);

const WANTS_SUB_CATEGORIES: ReadonlySet<string> = new Set([
  ESubExpenseCategories.dining,
  ESubExpenseCategories.entertainment,
  ESubExpenseCategories.shopping,
  ESubExpenseCategories.subscriptions,
]);

const RULE_SUM_TOLERANCE = 0.01;

const round2 = (n: number): number => Number(n.toFixed(2));

export function assertValidRule(rule: IBudgetRule): void {
  const parts = [rule.needs, rule.wants, rule.savings];
  const sum = parts.reduce((total, p) => total + p, 0);
  if (parts.some((p) => !Number.isFinite(p) || p < 0)) {
    throw new CustomError(
      "Rule percentages must be non-negative numbers",
      "INVALID_BUDGET_RULE"
    );
  }
  if (Math.abs(sum - 100) > RULE_SUM_TOLERANCE) {
    throw new CustomError(
      "Rule percentages must sum to 100",
      "INVALID_BUDGET_RULE"
    );
  }
}

/** Returns the segment an expense belongs to, or undefined if it cannot be placed */
export function segmentOfExpense(
  subCategory?: string
): ESpendSegment | undefined {
  if (!subCategory) return undefined;
  if (NEEDS_SUB_CATEGORIES.has(subCategory)) return ESpendSegment.needs;
  if (WANTS_SUB_CATEGORIES.has(subCategory)) return ESpendSegment.wants;
  return undefined;
}

const statusOf = (
  actual: number,
  income: number,
  targetPercent: number
): ESegmentStatus => {
  if (income <= 0) {
    return actual > 0 ? ESegmentStatus.aboveTarget : ESegmentStatus.onTarget;
  }
  const gap = (actual / income) * 100 - targetPercent;
  if (Math.abs(gap) <= SEGMENT_TOLERANCE_PERCENT)
    return ESegmentStatus.onTarget;
  return gap > 0 ? ESegmentStatus.aboveTarget : ESegmentStatus.belowTarget;
};

type Totals = Record<ESpendSegment, number> & {
  income: number;
  unsegmented: number;
  unclassified: number;
};

const EMPTY_TOTALS: Totals = {
  [ESpendSegment.needs]: 0,
  [ESpendSegment.wants]: 0,
  [ESpendSegment.savings]: 0,
  income: 0,
  unsegmented: 0,
  unclassified: 0,
};

/** Money leaving the account is negative in `net`; segment totals are positive outflow */
const outflow = (spend: ICategorySpend): number => -spend.net;

const addSpend = (totals: Totals, spend: ICategorySpend): Totals => {
  switch (spend.category) {
    case EBaseCategories.income:
      return { ...totals, income: totals.income + spend.net };
    case EBaseCategories.savings:
    case EBaseCategories.investment:
      return {
        ...totals,
        [ESpendSegment.savings]: totals[ESpendSegment.savings] + outflow(spend),
      };
    case EBaseCategories.loan:
      return {
        ...totals,
        [ESpendSegment.needs]: totals[ESpendSegment.needs] + outflow(spend),
      };
    case EBaseCategories.expenses: {
      const segment = segmentOfExpense(spend.subCategory);
      return segment
        ? { ...totals, [segment]: totals[segment] + outflow(spend) }
        : { ...totals, unsegmented: totals.unsegmented + outflow(spend) };
    }
    case EBaseCategories.unclassified:
      return { ...totals, unclassified: totals.unclassified + outflow(spend) };
    default:
      return totals;
  }
};

export function buildSegmentation(
  spends: ReadonlyArray<ICategorySpend>,
  rule: IBudgetRule,
  period: { month: number; year: number }
): IBudgetSegmentation {
  assertValidRule(rule);
  const totals = spends.reduce(addSpend, EMPTY_TOTALS);
  const targets: Record<ESpendSegment, number> = {
    [ESpendSegment.needs]: rule.needs,
    [ESpendSegment.wants]: rule.wants,
    [ESpendSegment.savings]: rule.savings,
  };

  const segments: ISegmentSummary[] = Object.values(ESpendSegment).map(
    (segment) => {
      const actual = totals[segment];
      const targetPercent = targets[segment];
      const targetAmount = (totals.income * targetPercent) / 100;
      const percentOfIncome =
        totals.income > 0 ? (actual / totals.income) * 100 : 0;
      return {
        segment,
        actual: round2(actual),
        percentOfIncome: round2(percentOfIncome),
        targetPercent,
        targetAmount: round2(targetAmount),
        variance: round2(actual - targetAmount),
        status: statusOf(actual, totals.income, targetPercent),
      };
    }
  );

  return {
    ...period,
    totalIncome: round2(totals.income),
    segments,
    unsegmentedExpenses: round2(totals.unsegmented),
    unclassified: round2(totals.unclassified),
  };
}
