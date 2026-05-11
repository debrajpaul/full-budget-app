import { SinkingFundService } from "./sinking-fund-service";
import { mock } from "jest-mock-extended";
import { ILogger, ETenantType, ISinkingFundStore, ISinkingFund } from "@common";

const makeFund = (overrides: Partial<ISinkingFund> = {}): ISinkingFund => ({
  id: "sf-1",
  name: "Car Insurance",
  target: 600,
  current: 150,
  monthlyContribution: 50,
  deadline: "2025-12-31",
  history: [{ date: "2025-12-31", value: 150 }],
  ...overrides,
});

describe("SinkingFundService", () => {
  const tenantId = ETenantType.default;
  const userId = "user-123";

  let logger: ReturnType<typeof mock<ILogger>>;
  let store: ReturnType<typeof mock<ISinkingFundStore>>;
  let service: SinkingFundService;

  beforeEach(() => {
    logger = mock<ILogger>();
    store = mock<ISinkingFundStore>();
    service = new SinkingFundService(logger, store);
  });

  describe("getSinkingFunds", () => {
    it("delegates to store.listSinkingFunds and returns the result", async () => {
      const funds = [makeFund()];
      store.listSinkingFunds.mockResolvedValue(funds);

      const result = await service.getSinkingFunds(tenantId, userId);

      expect(store.listSinkingFunds).toHaveBeenCalledWith(tenantId, userId);
      expect(logger.debug).toHaveBeenCalledWith("Fetching sinking funds", {
        tenantId,
        userId,
      });
      expect(result).toEqual(funds);
    });
  });

  describe("createSinkingFund", () => {
    it("delegates to store.createSinkingFund and returns the new fund", async () => {
      const input = {
        name: "Emergency Fund",
        target: 1000,
        monthlyContribution: 100,
      };
      const created = makeFund({
        id: "sf-new",
        name: "Emergency Fund",
        target: 1000,
        current: 0,
      });
      store.createSinkingFund.mockResolvedValue(created);

      const result = await service.createSinkingFund(tenantId, userId, input);

      expect(store.createSinkingFund).toHaveBeenCalledWith(
        tenantId,
        userId,
        input
      );
      expect(result).toEqual(created);
    });
  });

  describe("updateSinkingFund", () => {
    it("throws NOT_FOUND when fund does not exist", async () => {
      store.getSinkingFund.mockResolvedValue(null);

      await expect(
        service.updateSinkingFund(tenantId, userId, "missing-id", {
          name: "New Name",
        })
      ).rejects.toMatchObject({ code: "NOT_FOUND" });
    });

    it("calls store.updateSinkingFund when fund exists", async () => {
      const existing = makeFund();
      const updated = makeFund({ name: "Updated Name" });
      store.getSinkingFund.mockResolvedValue(existing);
      store.updateSinkingFund.mockResolvedValue(updated);

      const result = await service.updateSinkingFund(tenantId, userId, "sf-1", {
        name: "Updated Name",
      });

      expect(store.updateSinkingFund).toHaveBeenCalledWith(
        tenantId,
        userId,
        "sf-1",
        { name: "Updated Name" }
      );
      expect(result).toEqual(updated);
    });
  });

  describe("contributeSinkingFund", () => {
    it("throws NOT_FOUND when fund does not exist", async () => {
      store.getSinkingFund.mockResolvedValue(null);

      await expect(
        service.contributeSinkingFund(tenantId, userId, "missing-id", 50)
      ).rejects.toMatchObject({ code: "NOT_FOUND" });
    });

    it("calls store.contributeSinkingFund with today's date", async () => {
      const existing = makeFund();
      const contributed = makeFund({ current: 200 });
      store.getSinkingFund.mockResolvedValue(existing);
      store.contributeSinkingFund.mockResolvedValue(contributed);

      const before = new Date().toISOString().split("T")[0];
      const result = await service.contributeSinkingFund(
        tenantId,
        userId,
        "sf-1",
        50
      );
      const after = new Date().toISOString().split("T")[0];

      expect(store.contributeSinkingFund).toHaveBeenCalledWith(
        tenantId,
        userId,
        "sf-1",
        50,
        expect.stringMatching(/^\d{4}-\d{2}-\d{2}$/)
      );
      const calledDate = (
        store.contributeSinkingFund.mock.calls[0] as any[]
      )[4];
      expect(calledDate >= before && calledDate <= after).toBe(true);
      expect(result).toEqual(contributed);
    });
  });

  describe("deleteSinkingFund", () => {
    it("throws NOT_FOUND when fund does not exist", async () => {
      store.getSinkingFund.mockResolvedValue(null);

      await expect(
        service.deleteSinkingFund(tenantId, userId, "missing-id")
      ).rejects.toMatchObject({ code: "NOT_FOUND" });
    });

    it("calls store.deleteSinkingFund and returns true", async () => {
      const existing = makeFund();
      store.getSinkingFund.mockResolvedValue(existing);
      store.deleteSinkingFund.mockResolvedValue(undefined);

      const result = await service.deleteSinkingFund(tenantId, userId, "sf-1");

      expect(store.deleteSinkingFund).toHaveBeenCalledWith(
        tenantId,
        userId,
        "sf-1"
      );
      expect(result).toBe(true);
    });
  });
});
