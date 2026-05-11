import { SavingsGoalStore } from "./savings-goal-store";
import { mock } from "jest-mock-extended";
import { DynamoDBDocumentClient } from "@aws-sdk/lib-dynamodb";
import { ILogger, ETenantType, ISavingsGoal } from "@common";

const TABLE = "savings-goals";
const TENANT = ETenantType.default;
const USER_ID = "user-1";
const GOAL_UUID = "uuid-abc-123";
const GOAL_ID = `${USER_ID}#${GOAL_UUID}`;

const makeItem = (
  overrides: Partial<ISavingsGoal & { goalId: string }> = {}
) => ({
  id: GOAL_UUID,
  goalId: GOAL_ID,
  name: "Emergency Fund",
  target: 1000,
  current: 100,
  deadline: "2026-12-31",
  history: [{ date: "2025-01-01", value: 100 }],
  ...overrides,
});

describe("SavingsGoalStore", () => {
  let storeMock: { send: jest.Mock };
  let logger: ReturnType<typeof mock<ILogger>>;
  let store: SavingsGoalStore;

  beforeEach(() => {
    logger = mock<ILogger>();
    storeMock = { send: jest.fn() };
    store = new SavingsGoalStore(
      logger,
      TABLE,
      storeMock as unknown as DynamoDBDocumentClient
    );
  });

  describe("listSavingsGoals", () => {
    it("queries by tenantId and userId# prefix", async () => {
      storeMock.send.mockResolvedValue({ Items: [makeItem()] });

      const result = await store.listSavingsGoals(TENANT, USER_ID);

      const cmd = storeMock.send.mock.calls[0][0];
      expect(cmd.input.TableName).toBe(TABLE);
      expect(cmd.input.ExpressionAttributeValues).toMatchObject({
        ":tenantId": TENANT,
        ":prefix": `${USER_ID}#`,
      });
      expect(result).toHaveLength(1);
      expect(result[0].id).toBe(GOAL_UUID);
    });

    it("returns [] when no items exist", async () => {
      storeMock.send.mockResolvedValue({ Items: [] });

      const result = await store.listSavingsGoals(TENANT, USER_ID);

      expect(result).toEqual([]);
    });
  });

  describe("getSavingsGoalById", () => {
    it("fetches by composite key tenantId + userId#id", async () => {
      storeMock.send.mockResolvedValue({ Item: makeItem() });

      const result = await store.getSavingsGoalById(TENANT, USER_ID, GOAL_UUID);

      const cmd = storeMock.send.mock.calls[0][0];
      expect(cmd.input.Key).toEqual({ tenantId: TENANT, goalId: GOAL_ID });
      expect(result?.id).toBe(GOAL_UUID);
    });

    it("returns null when item not found", async () => {
      storeMock.send.mockResolvedValue({ Item: undefined });

      const result = await store.getSavingsGoalById(TENANT, USER_ID, "missing");

      expect(result).toBeNull();
    });
  });

  describe("createSavingsGoal", () => {
    it("stores item with goalId = userId#uuid, current and history seeded from initialAmount", async () => {
      storeMock.send.mockResolvedValue({});

      const result = await store.createSavingsGoal(TENANT, USER_ID, {
        name: "Holiday",
        target: 500,
        deadline: "2026-06-01",
        initialAmount: 200,
      });

      const cmd = storeMock.send.mock.calls[0][0];
      const item = cmd.input.Item;
      expect(item.tenantId).toBe(TENANT);
      expect(item.goalId).toMatch(new RegExp(`^${USER_ID}#`));
      expect(item.name).toBe("Holiday");
      expect(item.target).toBe(500);
      expect(item.current).toBe(200);
      expect(item.history).toHaveLength(1);
      expect(item.history[0].value).toBe(200);
      expect(result.current).toBe(200);
    });

    it("defaults initialAmount to 100 when not provided", async () => {
      storeMock.send.mockResolvedValue({});

      const result = await store.createSavingsGoal(TENANT, USER_ID, {
        name: "Car Fund",
        target: 1000,
        deadline: "2027-01-01",
      });

      const cmd = storeMock.send.mock.calls[0][0];
      expect(cmd.input.Item.current).toBe(100);
      expect(cmd.input.Item.history[0].value).toBe(100);
      expect(result.current).toBe(100);
    });

    it("logs creation with tenantId and goalId", async () => {
      storeMock.send.mockResolvedValue({});

      await store.createSavingsGoal(TENANT, USER_ID, {
        name: "Travel",
        target: 800,
        deadline: "2026-01-01",
      });

      expect(logger.debug).toHaveBeenCalledWith(
        "Creating savings goal",
        expect.objectContaining({ tenantId: TENANT })
      );
    });
  });

  describe("updateSavingsGoal", () => {
    it("builds SET expression only for provided fields (PATCH semantics)", async () => {
      storeMock.send.mockResolvedValue({
        Attributes: makeItem({ name: "Renamed", target: 1500 }),
      });

      await store.updateSavingsGoal(TENANT, USER_ID, GOAL_UUID, {
        name: "Renamed",
        target: 1500,
      });

      const cmd = storeMock.send.mock.calls[0][0];
      expect(cmd.input.UpdateExpression).toContain(":name");
      expect(cmd.input.UpdateExpression).toContain(":target");
      expect(cmd.input.UpdateExpression).not.toContain(":deadline");
      expect(cmd.input.ConditionExpression).toBe("attribute_exists(goalId)");
      expect(cmd.input.Key).toEqual({ tenantId: TENANT, goalId: GOAL_ID });
    });

    it("returns existing item via GetCommand when no fields provided", async () => {
      storeMock.send.mockResolvedValue({ Item: makeItem() });

      const result = await store.updateSavingsGoal(
        TENANT,
        USER_ID,
        GOAL_UUID,
        {}
      );

      expect(storeMock.send).toHaveBeenCalledTimes(1);
      const cmd = storeMock.send.mock.calls[0][0];
      expect(cmd.input.UpdateExpression).toBeUndefined();
      expect(result?.name).toBe("Emergency Fund");
    });
  });

  describe("deleteSavingsGoal", () => {
    it("sends DeleteCommand with correct composite key", async () => {
      storeMock.send.mockResolvedValue({});

      await store.deleteSavingsGoal(TENANT, USER_ID, GOAL_UUID);

      const cmd = storeMock.send.mock.calls[0][0];
      expect(cmd.input.TableName).toBe(TABLE);
      expect(cmd.input.Key).toEqual({ tenantId: TENANT, goalId: GOAL_ID });
    });
  });

  describe("addContribution", () => {
    it("increments current and appends history point via list_append", async () => {
      const after = makeItem({
        current: 350,
        history: [
          { date: "2025-01-01", value: 100 },
          { date: "2025-06-01", value: 250 },
        ],
      });
      storeMock.send.mockResolvedValue({ Attributes: after });

      const result = await store.addContribution(
        TENANT,
        USER_ID,
        GOAL_UUID,
        250,
        "2025-06-01"
      );

      const cmd = storeMock.send.mock.calls[0][0];
      expect(cmd.input.UpdateExpression).toContain("list_append");
      expect(cmd.input.ExpressionAttributeValues[":amount"]).toBe(250);
      expect(cmd.input.ExpressionAttributeValues[":point"]).toEqual([
        { date: "2025-06-01", value: 250 },
      ]);
      expect(cmd.input.ConditionExpression).toBe("attribute_exists(goalId)");
      expect(result.current).toBe(350);
      expect(result.history).toHaveLength(2);
    });

    it("logs the contribution with tenantId, goalId and amount", async () => {
      storeMock.send.mockResolvedValue({
        Attributes: makeItem({ current: 350 }),
      });

      await store.addContribution(
        TENANT,
        USER_ID,
        GOAL_UUID,
        250,
        "2025-06-01"
      );

      expect(logger.debug).toHaveBeenCalledWith(
        "Adding contribution to savings goal",
        expect.objectContaining({ tenantId: TENANT, amount: 250 })
      );
    });
  });
});
