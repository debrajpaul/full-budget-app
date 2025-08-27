import { SavingsGoalService } from "./savings-goal-service";
import { mock } from "jest-mock-extended";
import { ILogger, ETenantType } from "@common";

describe("SavingsGoalService", () => {
  it("returns default goals", async () => {
    const logger = mock<ILogger>();
    const service = new SavingsGoalService(logger);
    const goals = await service.getSavingsGoals(ETenantType.default, "user");
    expect(goals).toHaveLength(1);
    expect(goals[0]).toHaveProperty("id");
  });
});