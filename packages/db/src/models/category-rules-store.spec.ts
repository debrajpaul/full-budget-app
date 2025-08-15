import { CategoryRulesStore } from "./category-rules-store";
import { mock } from "jest-mock-extended";
import type { ILogger, ICategoryRules, ETenantType } from "@common";
import { DynamoDBDocumentClient } from "@aws-sdk/lib-dynamodb";

describe("CategoryRulesStore", () => {
  let storeMock: { send: jest.Mock };
  let loggerMock: ReturnType<typeof mock<ILogger>>;
  let rulesStore: CategoryRulesStore;
  const tableName = "categoryRules";
  const tenantId = "TENANT1" as ETenantType;
  const defaultTenant = "default" as ETenantType;

  beforeEach(() => {
    loggerMock = mock<ILogger>();
    storeMock = { send: jest.fn() };
    rulesStore = new CategoryRulesStore(
      loggerMock,
      tableName,
      storeMock as unknown as DynamoDBDocumentClient,
    );
  });

  it("should get rules by tenant including global defaults", async () => {
    const tenantRules: ICategoryRules[] = [
      {
        keyword: "food",
        category: "groceries",
        tenantId,
        ruleId: `${tenantId}#food`,
        isActive: true,
        createdAt: "2025-08-12T00:00:00.000Z",
      },
    ];
    const globalRules: ICategoryRules[] = [
      {
        keyword: "fuel",
        category: "transport",
        tenantId: defaultTenant,
        ruleId: `${defaultTenant}#fuel`,
        isActive: true,
        createdAt: "2025-08-12T00:00:00.000Z",
      },
      {
        keyword: "food",
        category: "dining",
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
    expect(result).toEqual({ food: "groceries", fuel: "transport" });
  });

  it("should add multiple rules in chunks", async () => {
    const rules = { food: "groceries", fuel: "transport", rent: "housing" };
    const addRuleSpy = jest.spyOn(rulesStore, "addRule").mockResolvedValue();
    await rulesStore.addRules(tenantId, rules);
    expect(addRuleSpy).toHaveBeenCalledTimes(3);
    expect(loggerMock.info).toHaveBeenCalledWith("Saving rules to DynamoDB");
  });

  it("should add a single rule", async () => {
    storeMock.send.mockResolvedValue({});
    await rulesStore.addRule(tenantId, "FOOD", "groceries");
    expect(storeMock.send).toHaveBeenCalledWith(expect.objectContaining({
      TableName: tableName,
      Item: expect.objectContaining({
        ruleId: `${tenantId}#food`,
        tenantId,
        keyword: "food",
        category: "groceries",
        isActive: true,
      }),
      ConditionExpression: "attribute_not_exists(ruleId)",
    }));
    expect(loggerMock.info).toHaveBeenCalledWith("Saving rule to DynamoDB");
  });

  it("should remove a rule", () => {
    storeMock.send.mockResolvedValue({});
    rulesStore.removeRule(tenantId, `${tenantId}#food`);
    expect(storeMock.send).toHaveBeenCalledWith(expect.objectContaining({
      TableName: tableName,
      Key: {
        tenantId,
        ruleId: `${tenantId}#food`,
      },
    }));
    expect(loggerMock.info).toHaveBeenCalledWith("Rule removed successfully", {
      tenantId,
      ruleId: `${tenantId}#food`,
    });
  });

  it("should load rules for a tenant", async () => {
    const rules: ICategoryRules[] = [
      {
        keyword: "food",
        category: "groceries",
        tenantId,
        ruleId: `${tenantId}#food`,
        isActive: true,
        createdAt: "2025-08-12T00:00:00.000Z",
      },
      {
        keyword: "fuel",
        category: "transport",
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
});
