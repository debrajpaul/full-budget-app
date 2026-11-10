export enum ESpendSegment {
  needs = "NEEDS",
  wants = "WANTS",
  savings = "SAVINGS",
}

export enum ESegmentStatus {
  aboveTarget = "ABOVE_TARGET",
  onTarget = "ON_TARGET",
  belowTarget = "BELOW_TARGET",
}

/** Share of income per segment, in percent. Must sum to 100. */
export interface IBudgetRule {
  needs: number;
  wants: number;
  savings: number;
}

export const BUDGET_RULE_PRESETS = {
  rule503020: { needs: 50, wants: 30, savings: 20 },
  rule602020: { needs: 60, wants: 20, savings: 20 },
  rule702010: { needs: 70, wants: 20, savings: 10 },
} as const satisfies Record<string, IBudgetRule>;

export const DEFAULT_BUDGET_RULE: IBudgetRule = BUDGET_RULE_PRESETS.rule503020;

/** Percentage points either side of target that still count as on target */
export const SEGMENT_TOLERANCE_PERCENT = 1;

export interface ISegmentSummary {
  segment: ESpendSegment;
  actual: number;
  percentOfIncome: number;
  targetPercent: number;
  targetAmount: number;
  /** actual - targetAmount; positive = above target */
  variance: number;
  status: ESegmentStatus;
}

export interface IBudgetSegmentation {
  month: number;
  year: number;
  totalIncome: number;
  segments: ISegmentSummary[];
  /** Expenses with no sub-category, so they cannot be placed in a segment */
  unsegmentedExpenses: number;
  /** Spend the tagger could not categorise */
  unclassified: number;
}
