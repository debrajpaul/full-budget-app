import { BudgetStore } from "./budget-store";
import { mock } from "jest-mock-extended";
import { DynamoDBDocumentClient } from "@aws-sdk/lib-dynamodb";
import {
  ILogger,
  IBudget,
  ETenantType,
  EBaseCategories,
  ESubExpenseCategories,
} from "@common";

describe("BudgetStore", () => {
  let storeMock: { send: jest.Mock };
  let loggerMock: ReturnType<typeof mock<ILogger>>;
  let budgetStore: BudgetStore;
  const tableName = "budgets";
  const tenantId = ETenantType.default;
  const userId = "user1";
  const month = 8;
  const year = 2025;

  beforeEach(() => {
    loggerMock = mock<ILogger>();
    storeMock = { send: jest.fn() };
    budgetStore = new BudgetStore(
      loggerMock,
      tableName,
      storeMock as unknown as DynamoDBDocumentClient
    );
  });

  it("should set a budget using PutCommand with computed keys", async () => {
    storeMock.send = jest.fn().mockResolvedValue({});

    const category = EBaseCategories.expenses;
    const subCategory = ESubExpenseCategories.food;
    const amount = 1500;

    const result = await budgetStore.setBudget(
      tenantId,
      userId,
      year,
      month,
      category,
      amount,
      subCategory
    );

    expect(storeMock.send).toHaveBeenCalled();
    const callArg = storeMock.send.mock.calls[0][0];
    expect(callArg.input.TableName).toBe(tableName);

    const item = callArg.input.Item as IBudget;
    const expectedBudgetId = `${userId}#${year}-08#${category}`;
    expect(item.tenantId).toBe(tenantId);
    expect(item.userId).toBe(userId);
    expect(item.year).toBe(year);
    expect(item.month).toBe(month);
    expect(item.category).toBe(category);
    expect(item.subCategory).toBe(subCategory);
    expect(item.amount).toBe(amount);
    expect(item.budgetId).toBe(expectedBudgetId);
    expect(typeof item.createdAt).toBe("string");
    expect(typeof item.updatedAt).toBe("string");

    // also ensure the method returns the same item contents
    expect(result.userId).toBe(userId);
    expect(result.category).toBe(category);
    expect(result.amount).toBe(amount);

    expect(loggerMock.debug).toHaveBeenCalledWith("Upserting budget", {
      tenantId,
      budgetId: expectedBudgetId,
      amount,
    });
  });

  it("should get budgets by period and return category -> amount map", async () => {
    const items: IBudget[] = [
      {
        tenantId,
        budgetId: `${userId}#${year}-08#${EBaseCategories.expenses}`,
        userId,
        year,
        month,
        category: EBaseCategories.expenses,
        amount: 1000,
        createdAt: new Date().toISOString(),
      },
      {
        tenantId,
        budgetId: `${userId}#${year}-08#${EBaseCategories.income}`,
        userId,
        year,
        month,
        category: EBaseCategories.income,
        amount: 3000,
        createdAt: new Date().toISOString(),
      },
      // Same category again to verify aggregation
      {
        tenantId,
        budgetId: `${userId}#${year}-08#${EBaseCategories.expenses}`,
        userId,
        year,
        month,
        category: EBaseCategories.expenses,
        amount: 500,
        createdAt: new Date().toISOString(),
      },
    ];

    storeMock.send = jest.fn().mockResolvedValue({ Items: items });

    const map = await budgetStore.getBudgetsByPeriod(
      tenantId,
      userId,
      month,
      year
    );

    // Validates query prefix
    const command = storeMock.send.mock.calls[0][0];
    expect(command.input.ExpressionAttributeValues).toMatchObject({
      ":tenantId": tenantId,
      ":prefix": `${userId}#${year}-08#`,
    });

    expect(loggerMock.debug).toHaveBeenCalledWith(
      "Fetching budgets by period",
      {
        tenantId,
        userId,
        month,
        year,
      }
    );

    // Validates aggregation
    expect(map).toEqual({
      [EBaseCategories.expenses]: 1500,
      [EBaseCategories.income]: 3000,
    });
  });
});
