import { mock } from "jest-mock-extended";
import { ILogger, ETenantType, ISavingsGoalStore, ISavingsGoal } from "@common";
import { SavingsGoalService } from "./savings-goal-service";

const today = new Date().toISOString().split("T")[0];

const makeGoal = (overrides: Partial<ISavingsGoal> = {}): ISavingsGoal => ({
  id: "goal-uuid-1",
  name: "Emergency Fund",
  target: 1000,
  current: 100,
  deadline: "2026-12-31",
  history: [{ date: today, value: 100 }],
  ...overrides,
});

describe("SavingsGoalService", () => {
  const tenantId = ETenantType.default;
  const userId = "user-123";

  let logger: ReturnType<typeof mock<ILogger>>;
  let store: ReturnType<typeof mock<ISavingsGoalStore>>;
  let service: SavingsGoalService;

  beforeEach(() => {
    logger = mock<ILogger>();
    store = mock<ISavingsGoalStore>();
    service = new SavingsGoalService(logger, store);
  });

  describe("getSavingsGoals", () => {
    it("delegates to store and logs", async () => {
      const goals = [makeGoal()];
      store.listSavingsGoals.mockResolvedValue(goals);

      const result = await service.getSavingsGoals(tenantId, userId);

      expect(logger.debug).toHaveBeenCalledWith("Fetching savings goals", {
        tenantId,
        userId,
      });
      expect(store.listSavingsGoals).toHaveBeenCalledWith(tenantId, userId);
      expect(result).toEqual(goals);
    });
  });

  describe("createSavingsGoal", () => {
    it("creates a goal with default initialAmount=100 and seeds history", async () => {
      const input = { name: "Holiday", target: 500, deadline: "2026-06-01" };
      const created = makeGoal({
        id: "new-uuid",
        name: "Holiday",
        target: 500,
        current: 100,
        history: [{ date: today, value: 100 }],
      });
      store.createSavingsGoal.mockResolvedValue(created);

      const result = await service.createSavingsGoal(tenantId, userId, input);

      expect(store.createSavingsGoal).toHaveBeenCalledWith(
        tenantId,
        userId,
        input
      );
      expect(result.current).toBe(100);
      expect(result.history).toHaveLength(1);
    });

    it("creates a goal with provided initialAmount", async () => {
      const input = {
        name: "Car",
        target: 2000,
        deadline: "2027-01-01",
        initialAmount: 200,
      };
      const created = makeGoal({
        name: "Car",
        target: 2000,
        current: 200,
        history: [{ date: today, value: 200 }],
      });
      store.createSavingsGoal.mockResolvedValue(created);

      const result = await service.createSavingsGoal(tenantId, userId, input);

      expect(result.current).toBe(200);
      expect(result.history[0].value).toBe(200);
    });
  });

  describe("updateSavingsGoal", () => {
    it("updates an existing goal with PATCH fields", async () => {
      const existing = makeGoal();
      const updated = makeGoal({ name: "Renamed Fund", target: 1500 });
      store.getSavingsGoalById.mockResolvedValue(existing);
      store.updateSavingsGoal.mockResolvedValue(updated);

      const result = await service.updateSavingsGoal(
        tenantId,
        userId,
        "goal-uuid-1",
        {
          name: "Renamed Fund",
          target: 1500,
        }
      );

      expect(store.getSavingsGoalById).toHaveBeenCalledWith(
        tenantId,
        userId,
        "goal-uuid-1"
      );
      expect(store.updateSavingsGoal).toHaveBeenCalledWith(
        tenantId,
        userId,
        "goal-uuid-1",
        { name: "Renamed Fund", target: 1500 }
      );
      expect(result.name).toBe("Renamed Fund");
    });

    it("throws NOT_FOUND when goal does not exist", async () => {
      store.getSavingsGoalById.mockResolvedValue(null);

      await expect(
        service.updateSavingsGoal(tenantId, userId, "missing", {})
      ).rejects.toMatchObject({ code: "NOT_FOUND" });

      expect(store.updateSavingsGoal).not.toHaveBeenCalled();
    });
  });

  describe("deleteSavingsGoal", () => {
    it("deletes an existing goal and returns true", async () => {
      store.getSavingsGoalById.mockResolvedValue(makeGoal());
      store.deleteSavingsGoal.mockResolvedValue(undefined);

      const result = await service.deleteSavingsGoal(
        tenantId,
        userId,
        "goal-uuid-1"
      );

      expect(store.deleteSavingsGoal).toHaveBeenCalledWith(
        tenantId,
        userId,
        "goal-uuid-1"
      );
      expect(result).toBe(true);
    });

    it("throws NOT_FOUND when goal does not exist", async () => {
      store.getSavingsGoalById.mockResolvedValue(null);

      await expect(
        service.deleteSavingsGoal(tenantId, userId, "missing")
      ).rejects.toMatchObject({ code: "NOT_FOUND" });

      expect(store.deleteSavingsGoal).not.toHaveBeenCalled();
    });
  });

  describe("contributeSavingsGoal", () => {
    it("appends a history point and increases current", async () => {
      const existing = makeGoal({ current: 100 });
      const afterContrib = makeGoal({
        current: 350,
        history: [
          { date: today, value: 100 },
          { date: today, value: 250 },
        ],
      });
      store.getSavingsGoalById.mockResolvedValue(existing);
      store.addContribution.mockResolvedValue(afterContrib);

      const result = await service.contributeSavingsGoal(tenantId, userId, {
        id: "goal-uuid-1",
        amount: 250,
      });

      expect(store.addContribution).toHaveBeenCalledWith(
        tenantId,
        userId,
        "goal-uuid-1",
        250,
        today
      );
      expect(result.current).toBe(350);
      expect(result.history).toHaveLength(2);
    });

    it("throws NOT_FOUND when goal does not exist", async () => {
      store.getSavingsGoalById.mockResolvedValue(null);

      await expect(
        service.contributeSavingsGoal(tenantId, userId, {
          id: "missing",
          amount: 100,
        })
      ).rejects.toMatchObject({ code: "NOT_FOUND" });

      expect(store.addContribution).not.toHaveBeenCalled();
    });
  });
});
