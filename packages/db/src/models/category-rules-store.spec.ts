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

  it("should get rules by tenant including global defaults and respect overrides", async () => {
    const tenantRules: ICategoryRules[] = [
      {
        keyword: "food",
        category: EBaseCategories.income,
        tenantId,
        ruleId: `${tenantId}#food`,
        isActive: true,
        createdAt: "2025-08-12T00:00:00.000Z",
      },
    ];
    const globalRules: ICategoryRules[] = [
      {
        keyword: "fuel",
        category: EBaseCategories.expenses,
        tenantId: defaultTenant,
        ruleId: `${defaultTenant}#fuel`,
        isActive: true,
        createdAt: "2025-08-12T00:00:00.000Z",
      },
      {
        keyword: "food",
        category: EBaseCategories.expenses,
        tenantId: defaultTenant,
        ruleId: `${defaultTenant}#food`,
        isActive: true,
        createdAt: "2025-08-12T00:00:00.000Z",
      },
    ];
    storeMock.send
      .mockResolvedValueOnce({ Items: tenantRules })
      .mockResolvedValueOnce({ Items: globalRules });
    const result = await rulesStore.getRulesByTenant(tenantId);
    expect(result).toEqual({
      // tenant override should win over global
      food: EBaseCategories.income,
      fuel: EBaseCategories.expenses,
    });
  });

  it("should add multiple rules in chunks", async () => {
    const rules = {
      saving: EBaseCategories.savings,
      expenses: EBaseCategories.expenses,
      income: EBaseCategories.income,
    };
    const addRuleSpy = jest.spyOn(rulesStore, "addRule").mockResolvedValue();
    await rulesStore.addRules(tenantId, rules);
    expect(addRuleSpy).toHaveBeenCalledTimes(3);
    expect(loggerMock.info).toHaveBeenCalledWith("Saving rules to DynamoDB");
  });

  it("should add a single rule", async () => {
    storeMock.send.mockResolvedValue({});
    await rulesStore.addRule(tenantId, "FOOD", EBaseCategories.expenses);
    expect(storeMock.send).toHaveBeenCalledWith(expect.any(PutCommand));
    const calledCommand = storeMock.send.mock.calls[0][0];
    expect(calledCommand.input).toMatchObject({
      TableName: tableName,
      Item: expect.objectContaining({
        ruleId: `${tenantId}#food`,
        tenantId,
        keyword: "food",
        category: EBaseCategories.expenses,
        isActive: true,
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

  it("should load rules for a tenant", async () => {
    const rules: ICategoryRules[] = [
      {
        keyword: "food",
        category: EBaseCategories.expenses,
        tenantId,
        ruleId: `${tenantId}#food`,
        isActive: true,
        createdAt: "2025-08-12T00:00:00.000Z",
      },
      {
        keyword: "fuel",
        category: EBaseCategories.expenses,
        tenantId,
        ruleId: `${tenantId}#fuel`,
        isActive: true,
        createdAt: "2025-08-12T00:00:00.000Z",
      },
    ];
    storeMock.send.mockResolvedValue({ Items: rules });
    const result = await rulesStore["loadRules"](tenantId);
    expect(result).toEqual(rules);
    expect(storeMock.send).toHaveBeenCalled();
  });

  it("should list categories grouped by base with tenant overrides", async () => {
    const tenantRules: ICategoryRules[] = [
      {
        keyword: "food",
        category: EBaseCategories.expenses,
        tenantId,
        ruleId: `${tenantId}#food`,
        isActive: true,
        createdAt: "2025-08-12T00:00:00.000Z",
      },
      {
        keyword: "salary",
        category: EBaseCategories.income,
        tenantId,
        ruleId: `${tenantId}#salary`,
        isActive: true,
        createdAt: "2025-08-12T00:00:00.000Z",
      },
    ];
    const globalRules: ICategoryRules[] = [
      {
        keyword: "fuel",
        category: EBaseCategories.expenses,
        tenantId: defaultTenant,
        ruleId: `${defaultTenant}#fuel`,
        isActive: true,
        createdAt: "2025-08-12T00:00:00.000Z",
      },
      {
        // Should not duplicate because tenant already has "food"
        keyword: "food",
        category: EBaseCategories.expenses,
        tenantId: defaultTenant,
        ruleId: `${defaultTenant}#food`,
        isActive: true,
        createdAt: "2025-08-12T00:00:00.000Z",
      },
    ];

    storeMock.send
      .mockResolvedValueOnce({ Items: tenantRules })
      .mockResolvedValueOnce({ Items: globalRules });

    const result = await rulesStore.listCategoriesByBase(tenantId);
    expect(result[EBaseCategories.expenses]).toEqual(["food", "fuel"]);
    expect(result[EBaseCategories.income]).toEqual(["salary"]);
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

    // Unknown -> default
    expect(rulesStore.mapClassificationToEnums("UNKNOWN_LABEL")).toEqual({
      category: EBaseCategories.default,
    });
  });
});
