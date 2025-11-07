import { mock } from "jest-mock-extended";
import { ILogger, ETenantType } from "@common";
import { SavingsGoalService } from "./savings-goal-service";

describe("SavingsGoalService", () => {
  const tenantId = ETenantType.default;
  const userId = "user-123";

  let logger: ReturnType<typeof mock<ILogger>>;

  beforeEach(() => {
    logger = mock<ILogger>();
  });

  it("returns placeholder goals and logs fetch request", async () => {
    const service = new SavingsGoalService(logger);
    const goals = await service.getSavingsGoals(tenantId, userId);

    expect(logger.debug).toHaveBeenCalledWith("Fetching savings goals", {
      tenantId,
      userId,
    });
    expect(goals).toHaveLength(1);

    const [goal] = goals;
    expect(goal).toEqual(
      expect.objectContaining({
        id: expect.any(String),
        name: expect.any(String),
        target: expect.any(Number),
        current: expect.any(Number),
        deadline: expect.any(String),
        history: expect.arrayContaining([
          expect.objectContaining({
            date: expect.any(String),
            value: expect.any(Number),
          }),
        ]),
      }),
    );
  });
});
