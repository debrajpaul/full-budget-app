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
        ruleId: `${tenantId}#/${/food/i.source}/${/food/i.flags}`,
        taggedBy: "system",
        createdAt: "2025-08-12T00:00:00.000Z",
        when: "ANY",
      },
    ];
    const globalRules: ICategoryRules[] = [
      {
        match: /fuel/i,
        category: EBaseCategories.expenses,
        tenantId: defaultTenant,
        ruleId: `${defaultTenant}#/${/fuel/i.source}/${/fuel/i.flags}`,
        taggedBy: "system",
        createdAt: "2025-08-12T00:00:00.000Z",
        when: "ANY",
      },
      {
        match: /food/i,
        category: EBaseCategories.expenses,
        tenantId: defaultTenant,
        ruleId: `${defaultTenant}#/${/food/i.source}/${/food/i.flags}`,
        taggedBy: "system",
        createdAt: "2025-08-12T00:00:00.000Z",
        when: "ANY",
      },
    ];
    const toDbItems = (arr: ICategoryRules[]) =>
      arr.map((r) => ({
        ruleId: r.ruleId,
        tenantId: r.tenantId,
        pattern: r.match.source,
        flags: r.match.flags,
        category: r.category,
        taggedBy: r.taggedBy,
        createdAt: r.createdAt,
        when: r.when,
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
      {
        match: /saving/i,
        category: EBaseCategories.savings,
        taggedBy: "system",
      },
      {
        match: /expenses/i,
        category: EBaseCategories.expenses,
        taggedBy: "system",
      },
      {
        match: /income/i,
        category: EBaseCategories.income,
        taggedBy: "system",
      },
    ];
    const addRuleSpy = jest.spyOn(rulesStore, "addRule").mockResolvedValue();
    await rulesStore.addRules(tenantId, rules);
    expect(addRuleSpy).toHaveBeenCalledTimes(3);
    expect(loggerMock.info).toHaveBeenCalledWith("Saving rules to DynamoDB");
  });

  it("adds a single rule", async () => {
    storeMock.send.mockResolvedValue({});
    const regex = /food/i;
    await rulesStore.addRule(tenantId, {
      match: regex,
      category: EBaseCategories.expenses,
      taggedBy: "system",
      subCategory: ESubExpenseCategories.food,
      reason: "auto-tag",
      confidence: 0.9,
    });
    expect(storeMock.send).toHaveBeenNthCalledWith(
      1,
      expect.any(DeleteCommand),
    );
    expect(storeMock.send).toHaveBeenNthCalledWith(2, expect.any(PutCommand));

    const deleteCommand = storeMock.send.mock.calls[0][0];
    expect(deleteCommand.input).toMatchObject({
      TableName: tableName,
      Key: {
        tenantId,
        ruleId: `${tenantId}#/${regex.source}/${regex.flags}`,
      },
    });

    const putCommand = storeMock.send.mock.calls[1][0];
    expect(putCommand.input).toMatchObject({
      TableName: tableName,
      Item: expect.objectContaining({
        ruleId: `${tenantId}#/${regex.source}/${regex.flags}#ANY`,
        tenantId,
        pattern: regex.source,
        flags: regex.flags,
        category: EBaseCategories.expenses,
        subCategory: ESubExpenseCategories.food,
        taggedBy: "system",
        reason: "auto-tag",
        confidence: 0.9,
        when: "ANY",
        createdAt: expect.any(String),
      }),
      ConditionExpression: "attribute_not_exists(ruleId) OR #when = :when",
      ExpressionAttributeNames: {
        "#when": "when",
      },
      ExpressionAttributeValues: {
        ":when": "ANY",
      },
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
        ruleId: `${tenantId}#/${/food/i.source}/${/food/i.flags}`,
        taggedBy: "system",
        createdAt: "2025-08-12T00:00:00.000Z",
      },
      {
        match: /fuel/i,
        category: EBaseCategories.expenses,
        tenantId,
        ruleId: `${tenantId}#/${/fuel/i.source}/${/fuel/i.flags}`,
        taggedBy: "system",
        createdAt: "2025-08-12T00:00:00.000Z",
      },
    ];
    const Items = rules.map((r) => ({
      ruleId: r.ruleId,
      tenantId: r.tenantId,
      pattern: r.match.source,
      flags: r.match.flags,
      category: r.category,
      taggedBy: r.taggedBy,
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
        ruleId: `${tenantId}#/${/food/i.source}/${/food/i.flags}`,
        taggedBy: "system",
        createdAt: "2025-08-12T00:00:00.000Z",
      },
      {
        match: /salary/i,
        category: EBaseCategories.income,
        tenantId,
        ruleId: `${tenantId}#/${/salary/i.source}/${/salary/i.flags}`,
        taggedBy: "system",
        createdAt: "2025-08-12T00:00:00.000Z",
      },
    ];
    const globalRules: ICategoryRules[] = [
      {
        match: /fuel/i,
        category: EBaseCategories.expenses,
        tenantId: defaultTenant,
        ruleId: `${defaultTenant}#/${/fuel/i.source}/${/fuel/i.flags}`,
        taggedBy: "system",
        createdAt: "2025-08-12T00:00:00.000Z",
      },
      {
        // Should not duplicate because tenant already has "food"
        match: /food/i,
        category: EBaseCategories.expenses,
        tenantId: defaultTenant,
        ruleId: `${defaultTenant}#/${/food/i.source}/${/food/i.flags}`,
        taggedBy: "system",
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
        taggedBy: r.taggedBy,
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
