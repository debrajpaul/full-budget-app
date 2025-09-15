import { CategoryRulesStore } from "./category-rules-store";
import { mock } from "jest-mock-extended";
import {
  ILogger,
  ICategoryRules,
  ETenantType,
  EBaseCategories,
  ESubInvestmentCategories,
  ESubExpenseCategories,
} from "@common";
import { DynamoDBDocumentClient } from "@aws-sdk/lib-dynamodb";
import { PutCommand, DeleteCommand } from "@aws-sdk/lib-dynamodb";

describe("CategoryRulesStore", () => {
  let storeMock: { send: jest.Mock };
  let loggerMock: ReturnType<typeof mock<ILogger>>;
  let rulesStore: CategoryRulesStore;
  const tableName = "categoryRules";
  const tenantId = ETenantType.personal;
  const defaultTenant = ETenantType.default;

  beforeEach(() => {
    loggerMock = mock<ILogger>();
    storeMock = { send: jest.fn() };
    rulesStore = new CategoryRulesStore(
      loggerMock,
      tableName,
      storeMock as unknown as DynamoDBDocumentClient,
    );
  });

  it("gets rules by tenant and appends global defaults", async () => {
    const tenantRules: ICategoryRules[] = [
      {
        match: /food/i,
        category: EBaseCategories.income,
        tenantId,
        ruleId: `${tenantId}#${/food/i}`,
        createdAt: "2025-08-12T00:00:00.000Z",
      },
    ];
    const globalRules: ICategoryRules[] = [
      {
        match: /fuel/i,
        category: EBaseCategories.expenses,
        tenantId: defaultTenant,
        ruleId: `${defaultTenant}#${/fuel/i}`,
        createdAt: "2025-08-12T00:00:00.000Z",
      },
      {
        match: /food/i,
        category: EBaseCategories.expenses,
        tenantId: defaultTenant,
        ruleId: `${defaultTenant}#${/food/i}`,
        createdAt: "2025-08-12T00:00:00.000Z",
      },
    ];
    const toDbItems = (arr: ICategoryRules[]) =>
      arr.map((r) => ({
        ruleId: r.ruleId,
        tenantId: r.tenantId,
        pattern: r.match.source,
        flags: r.match.flags,
        category: r.category,
        createdAt: r.createdAt,
      }));
    storeMock.send
      .mockResolvedValueOnce({ Items: toDbItems(tenantRules) })
      .mockResolvedValueOnce({ Items: toDbItems(globalRules) });
    const result = await rulesStore.getRulesByTenant(tenantId);
    // Returns tenant rules first, followed by global defaults (no override logic here)
    expect(result).toEqual([...tenantRules, ...globalRules]);
  });

  it("adds multiple rules in chunks", async () => {
    const rules: Array<
      Omit<ICategoryRules, "tenantId" | "ruleId" | "createdAt">
    > = [
      { match: /saving/i, category: EBaseCategories.savings },
      { match: /expenses/i, category: EBaseCategories.expenses },
      { match: /income/i, category: EBaseCategories.income },
    ];
    const addRuleSpy = jest.spyOn(rulesStore, "addRule").mockResolvedValue();
    await rulesStore.addRules(tenantId, rules as unknown as ICategoryRules[]);
    expect(addRuleSpy).toHaveBeenCalledTimes(3);
    expect(loggerMock.info).toHaveBeenCalledWith("Saving rules to DynamoDB");
  });

  it("adds a single rule", async () => {
    storeMock.send.mockResolvedValue({});
    const regex = /food/i;
    await rulesStore.addRule(tenantId, regex, EBaseCategories.expenses);
    expect(storeMock.send).toHaveBeenCalledWith(expect.any(PutCommand));
    const calledCommand = storeMock.send.mock.calls[0][0];
    expect(calledCommand.input).toMatchObject({
      TableName: tableName,
      Item: expect.objectContaining({
        ruleId: `${tenantId}#${regex}`,
        tenantId,
        pattern: regex.source,
        flags: regex.flags,
        category: EBaseCategories.expenses,
      }),
      ConditionExpression: "attribute_not_exists(ruleId)",
    });
    expect(loggerMock.info).toHaveBeenCalledWith("Saving rule to DynamoDB");
  });

  it("should remove a rule", () => {
    storeMock.send.mockResolvedValue({});
    rulesStore.removeRule(tenantId, `${tenantId}#food`);
    expect(storeMock.send).toHaveBeenCalledWith(expect.any(DeleteCommand));
    const calledCommand = storeMock.send.mock.calls[0][0];
    expect(calledCommand.input).toMatchObject({
      TableName: tableName,
      Key: {
        tenantId,
        ruleId: `${tenantId}#food`,
      },
    });
    expect(loggerMock.info).toHaveBeenCalledWith("Rule removed successfully", {
      tenantId,
      ruleId: `${tenantId}#food`,
    });
  });

  it("loads rules for a tenant", async () => {
    const rules: ICategoryRules[] = [
      {
        match: /food/i,
        category: EBaseCategories.expenses,
        tenantId,
        ruleId: `${tenantId}#${/food/i}`,
        createdAt: "2025-08-12T00:00:00.000Z",
      },
      {
        match: /fuel/i,
        category: EBaseCategories.expenses,
        tenantId,
        ruleId: `${tenantId}#${/fuel/i}`,
        createdAt: "2025-08-12T00:00:00.000Z",
      },
    ];
    const Items = rules.map((r) => ({
      ruleId: r.ruleId,
      tenantId: r.tenantId,
      pattern: r.match.source,
      flags: r.match.flags,
      category: r.category,
      createdAt: r.createdAt,
    }));
    storeMock.send.mockResolvedValue({ Items });
    const result = await (rulesStore as any)["loadRules"](tenantId);
    expect(result).toEqual(rules);
    expect(storeMock.send).toHaveBeenCalled();
  });

  it("lists categories grouped by base with tenant overrides applied", async () => {
    const tenantRules: ICategoryRules[] = [
      {
        match: /food/i,
        category: EBaseCategories.expenses,
        tenantId,
        ruleId: `${tenantId}#${/food/i}`,
        createdAt: "2025-08-12T00:00:00.000Z",
      },
      {
        match: /salary/i,
        category: EBaseCategories.income,
        tenantId,
        ruleId: `${tenantId}#${/salary/i}`,
        createdAt: "2025-08-12T00:00:00.000Z",
      },
    ];
    const globalRules: ICategoryRules[] = [
      {
        match: /fuel/i,
        category: EBaseCategories.expenses,
        tenantId: defaultTenant,
        ruleId: `${defaultTenant}#${/fuel/i}`,
        createdAt: "2025-08-12T00:00:00.000Z",
      },
      {
        // Should not duplicate because tenant already has "food"
        match: /food/i,
        category: EBaseCategories.expenses,
        tenantId: defaultTenant,
        ruleId: `${defaultTenant}#${/food/i}`,
        createdAt: "2025-08-12T00:00:00.000Z",
      },
    ];
    const toDbItems = (arr: ICategoryRules[]) =>
      arr.map((r) => ({
        ruleId: r.ruleId,
        tenantId: r.tenantId,
        pattern: r.match.source,
        flags: r.match.flags,
        category: r.category,
        createdAt: r.createdAt,
      }));

    storeMock.send
      .mockResolvedValueOnce({ Items: toDbItems(tenantRules) })
      .mockResolvedValueOnce({ Items: toDbItems(globalRules) });

    const result = await rulesStore.listCategoriesByBase(tenantId);
    expect(result[EBaseCategories.expenses]).toEqual(["/food/i", "/fuel/i"]);
    expect(result[EBaseCategories.income]).toEqual(["/salary/i"]);
  });

  it("maps NLP classification labels to enums with synonyms", () => {
    // Direct base category
    expect(rulesStore.mapClassificationToEnums("INCOME")).toEqual({
      category: EBaseCategories.income,
    });
    // Direct sub-category
    expect(rulesStore.mapClassificationToEnums("FOOD")).toEqual({
      category: EBaseCategories.expenses,
      subCategory: ESubExpenseCategories.food,
    });
    // Synonyms for investment categories map under savings umbrella
    expect(rulesStore.mapClassificationToEnums("REAL ESTATE")).toEqual({
      category: EBaseCategories.savings,
      subCategory: ESubInvestmentCategories.realEstate,
    });
    expect(rulesStore.mapClassificationToEnums("MUTUAL-FUNDS")).toEqual({
      category: EBaseCategories.savings,
      subCategory: ESubInvestmentCategories.mutualFunds,
    });

    // Unknown -> unclassified
    expect(rulesStore.mapClassificationToEnums("UNKNOWN_LABEL")).toEqual({
      category: EBaseCategories.unclassified,
    });
  });
});
