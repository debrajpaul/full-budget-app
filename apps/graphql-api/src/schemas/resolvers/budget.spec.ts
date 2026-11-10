import { graphql } from "graphql";
import { mock, mockDeep } from "jest-mock-extended";
import {
  ESegmentStatus,
  ESpendSegment,
  ETenantType,
  IBudgetSegmentation,
  IGraphQLContext,
  ILogger,
} from "@app/common";
import { schema } from "../schema";

const query = /* GraphQL */ `
  query Segmentation($period: PeriodInput!, $rule: BudgetRuleInput) {
    budgetSegmentation(period: $period, rule: $rule) {
      month
      year
      totalIncome
      unsegmentedExpenses
      unclassified
      segments {
        segment
        actual
        percentOfIncome
        targetPercent
        targetAmount
        variance
        status
      }
    }
  }
`;

const makeSegmentation = (
  overrides: Partial<IBudgetSegmentation> = {}
): IBudgetSegmentation => ({
  month: 5,
  year: 2026,
  totalIncome: 100000,
  unsegmentedExpenses: 0,
  unclassified: 0,
  segments: [
    {
      segment: ESpendSegment.needs,
      actual: 40000,
      percentOfIncome: 40,
      targetPercent: 50,
      targetAmount: 50000,
      variance: -10000,
      status: ESegmentStatus.belowTarget,
    },
  ],
  ...overrides,
});

const buildContext = (overrides: Partial<IGraphQLContext> = {}) => {
  const dataSources = mockDeep<IGraphQLContext["dataSources"]>();
  const contextValue: IGraphQLContext = {
    logger: mock<ILogger>(),
    request: {} as IGraphQLContext["request"],
    response: undefined,
    lambdaContext: undefined,
    userId: "user-123",
    tenantId: ETenantType.default,
    email: "user@example.com",
    dataSources,
    ...overrides,
  };
  return { contextValue, dataSources };
};

describe("budgetSegmentation query", () => {
  const period = { month: 5, year: 2026 };

  it("returns the segmentation for the authenticated tenant and user", async () => {
    const { contextValue, dataSources } = buildContext();
    dataSources.budgetService.getSegmentation.mockResolvedValue(
      makeSegmentation()
    );

    const result = await graphql({
      schema,
      source: query,
      variableValues: { period },
      contextValue,
    });

    expect(result.errors).toBeUndefined();
    expect(dataSources.budgetService.getSegmentation).toHaveBeenCalledWith(
      ETenantType.default,
      "user-123",
      5,
      2026,
      undefined
    );
    expect(result.data?.budgetSegmentation).toMatchObject({
      totalIncome: 100000,
      segments: [{ segment: "NEEDS", status: "BELOW_TARGET" }],
    });
  });

  it("passes a custom rule through to the service", async () => {
    const { contextValue, dataSources } = buildContext();
    dataSources.budgetService.getSegmentation.mockResolvedValue(
      makeSegmentation()
    );
    const rule = { needs: 60, wants: 20, savings: 20 };

    await graphql({
      schema,
      source: query,
      variableValues: { period, rule },
      contextValue,
    });

    expect(dataSources.budgetService.getSegmentation).toHaveBeenCalledWith(
      ETenantType.default,
      "user-123",
      5,
      2026,
      rule
    );
  });

  it("rejects an unauthenticated request without calling the service", async () => {
    const { contextValue, dataSources } = buildContext({ userId: undefined });

    const result = await graphql({
      schema,
      source: query,
      variableValues: { period },
      contextValue,
    });

    expect(result.errors?.[0].message).toBe("Unauthorized");
    expect(dataSources.budgetService.getSegmentation).not.toHaveBeenCalled();
  });
});
