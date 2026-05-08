import { SinkingFundStore } from "./sinking-fund-store";
import { mock } from "jest-mock-extended";
import { DynamoDBDocumentClient } from "@aws-sdk/lib-dynamodb";
import { ILogger, ETenantType, ISinkingFund } from "@common";

const TABLE = "sinking-funds";
const TENANT = ETenantType.default;
const USER_ID = "user-1";
const FUND_UUID = "fund-uuid-abc";
const FUND_ID = `${USER_ID}#${FUND_UUID}`;

const makeItem = (
  overrides: Partial<
    ISinkingFund & {
      fundId: string;
      userId: string;
      createdAt: string;
      updatedAt: string;
    }
  > = {}
) => ({
  id: FUND_UUID,
  fundId: FUND_ID,
  userId: USER_ID,
  name: "Car Insurance",
  target: 600,
  current: 0,
  monthlyContribution: 50,
  deadline: "2026-12-31",
  history: [{ date: "2025-01-01", value: 0 }],
  createdAt: "2025-01-01T00:00:00Z",
  updatedAt: "2025-01-01T00:00:00Z",
  ...overrides,
});

describe("SinkingFundStore", () => {
  let storeMock: { send: jest.Mock };
  let logger: ReturnType<typeof mock<ILogger>>;
  let store: SinkingFundStore;

  beforeEach(() => {
    logger = mock<ILogger>();
    storeMock = { send: jest.fn() };
    store = new SinkingFundStore(
      logger,
      TABLE,
      storeMock as unknown as DynamoDBDocumentClient
    );
  });

  describe("listSinkingFunds", () => {
    it("queries by tenantId and userId# prefix", async () => {
      storeMock.send.mockResolvedValue({ Items: [makeItem()] });

      const result = await store.listSinkingFunds(TENANT, USER_ID);

      const cmd = storeMock.send.mock.calls[0][0];
      expect(cmd.input.TableName).toBe(TABLE);
      expect(cmd.input.ExpressionAttributeValues).toMatchObject({
        ":tenantId": TENANT,
        ":prefix": `${USER_ID}#`,
      });
      expect(result).toHaveLength(1);
      expect(result[0].id).toBe(FUND_UUID);
    });

    it("returns [] when no items exist", async () => {
      storeMock.send.mockResolvedValue({ Items: [] });

      const result = await store.listSinkingFunds(TENANT, USER_ID);

      expect(result).toEqual([]);
    });
  });

  describe("getSinkingFund", () => {
    it("fetches by composite key tenantId + userId#id", async () => {
      storeMock.send.mockResolvedValue({ Item: makeItem() });

      const result = await store.getSinkingFund(TENANT, USER_ID, FUND_UUID);

      const cmd = storeMock.send.mock.calls[0][0];
      expect(cmd.input.Key).toEqual({ tenantId: TENANT, fundId: FUND_ID });
      expect(result?.id).toBe(FUND_UUID);
    });

    it("returns null when fund not found", async () => {
      storeMock.send.mockResolvedValue({ Item: undefined });

      const result = await store.getSinkingFund(TENANT, USER_ID, "missing");

      expect(result).toBeNull();
    });
  });

  describe("createSinkingFund", () => {
    it("stores fund with fundId = userId#uuid, current=0, and seeds history with value 0", async () => {
      storeMock.send.mockResolvedValue({});

      const result = await store.createSinkingFund(TENANT, USER_ID, {
        name: "Emergency",
        target: 1000,
        monthlyContribution: 100,
      });

      const cmd = storeMock.send.mock.calls[0][0];
      const item = cmd.input.Item;
      expect(item.tenantId).toBe(TENANT);
      expect(item.fundId).toMatch(new RegExp(`^${USER_ID}#`));
      expect(item.current).toBe(0);
      expect(item.history).toHaveLength(1);
      expect(item.history[0].value).toBe(0);
      expect(result.current).toBe(0);
    });

    it("stores optional monthlyContribution and deadline when provided", async () => {
      storeMock.send.mockResolvedValue({});

      await store.createSinkingFund(TENANT, USER_ID, {
        name: "Vacation",
        target: 2000,
        monthlyContribution: 200,
        deadline: "2027-06-01",
      });

      const item = storeMock.send.mock.calls[0][0].input.Item;
      expect(item.monthlyContribution).toBe(200);
      expect(item.deadline).toBe("2027-06-01");
    });

    it("logs creation with tenantId and fundId", async () => {
      storeMock.send.mockResolvedValue({});

      await store.createSinkingFund(TENANT, USER_ID, {
        name: "Travel",
        target: 1500,
      });

      expect(logger.debug).toHaveBeenCalledWith(
        "Creating sinking fund",
        expect.objectContaining({ tenantId: TENANT })
      );
    });
  });

  describe("updateSinkingFund", () => {
    it("builds SET expression only for provided fields (PATCH semantics)", async () => {
      storeMock.send.mockResolvedValue({
        Attributes: makeItem({ name: "Updated" }),
      });

      await store.updateSinkingFund(TENANT, USER_ID, FUND_UUID, {
        name: "Updated",
      });

      const cmd = storeMock.send.mock.calls[0][0];
      expect(cmd.input.UpdateExpression).toContain(":name");
      expect(cmd.input.UpdateExpression).not.toContain(":target");
      expect(cmd.input.UpdateExpression).not.toContain(":deadline");
      expect(cmd.input.ConditionExpression).toBe("attribute_exists(tenantId)");
      expect(cmd.input.Key).toEqual({ tenantId: TENANT, fundId: FUND_ID });
    });

    it("always includes updatedAt in the SET expression", async () => {
      storeMock.send.mockResolvedValue({ Attributes: makeItem() });

      await store.updateSinkingFund(TENANT, USER_ID, FUND_UUID, {
        target: 800,
      });

      const cmd = storeMock.send.mock.calls[0][0];
      expect(cmd.input.UpdateExpression).toContain(":updatedAt");
    });

    it("includes all provided fields in SET expression", async () => {
      storeMock.send.mockResolvedValue({ Attributes: makeItem() });

      await store.updateSinkingFund(TENANT, USER_ID, FUND_UUID, {
        name: "New Name",
        target: 900,
        monthlyContribution: 75,
        deadline: "2027-01-01",
      });

      const cmd = storeMock.send.mock.calls[0][0];
      expect(cmd.input.UpdateExpression).toContain(":name");
      expect(cmd.input.UpdateExpression).toContain(":target");
      expect(cmd.input.UpdateExpression).toContain(":mc");
      expect(cmd.input.UpdateExpression).toContain(":deadline");
    });
  });

  describe("contributeSinkingFund", () => {
    it("increments current and appends history point via list_append", async () => {
      const after = makeItem({
        current: 150,
        history: [
          { date: "2025-01-01", value: 0 },
          { date: "2025-06-01", value: 150 },
        ],
      });
      storeMock.send.mockResolvedValue({ Attributes: after });

      const result = await store.contributeSinkingFund(
        TENANT,
        USER_ID,
        FUND_UUID,
        150,
        "2025-06-01"
      );

      const cmd = storeMock.send.mock.calls[0][0];
      expect(cmd.input.UpdateExpression).toContain("list_append");
      expect(cmd.input.ExpressionAttributeValues[":amount"]).toBe(150);
      expect(cmd.input.ExpressionAttributeValues[":point"]).toEqual([
        { date: "2025-06-01", value: 150 },
      ]);
      expect(cmd.input.ConditionExpression).toBe("attribute_exists(tenantId)");
      expect(result.current).toBe(150);
      expect(result.history).toHaveLength(2);
    });

    it("logs the contribution with tenantId, fundId and amount", async () => {
      storeMock.send.mockResolvedValue({
        Attributes: makeItem({ current: 150 }),
      });

      await store.contributeSinkingFund(
        TENANT,
        USER_ID,
        FUND_UUID,
        150,
        "2025-06-01"
      );

      expect(logger.debug).toHaveBeenCalledWith(
        "Contributing to sinking fund",
        expect.objectContaining({ tenantId: TENANT, amount: 150 })
      );
    });
  });

  describe("deleteSinkingFund", () => {
    it("sends DeleteCommand with correct composite key", async () => {
      storeMock.send.mockResolvedValue({});

      await store.deleteSinkingFund(TENANT, USER_ID, FUND_UUID);

      const cmd = storeMock.send.mock.calls[0][0];
      expect(cmd.input.TableName).toBe(TABLE);
      expect(cmd.input.Key).toEqual({ tenantId: TENANT, fundId: FUND_ID });
    });

    it("logs deletion with tenantId and fundId", async () => {
      storeMock.send.mockResolvedValue({});

      await store.deleteSinkingFund(TENANT, USER_ID, FUND_UUID);

      expect(logger.debug).toHaveBeenCalledWith(
        "Deleting sinking fund",
        expect.objectContaining({ tenantId: TENANT, fundId: FUND_ID })
      );
    });
  });
});
