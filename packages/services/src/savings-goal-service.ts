import {
  ILogger,
  ETenantType,
  ISavingsGoal,
  ISavingsGoalService,
} from "@common";

export class SavingsGoalService implements ISavingsGoalService {
  private readonly logger: ILogger;

  constructor(logger: ILogger) {
    this.logger = logger;
  }

  public async getSavingsGoals(
    tenantId: ETenantType,
    userId: string,
  ): Promise<ISavingsGoal[]> {
    this.logger.info("Fetching savings goals", { tenantId, userId });
    // Placeholder implementation
    return [
      {
        id: "goal-1",
        name: "Emergency Fund",
        target: 1000,
        current: 250,
        deadline: new Date().toISOString().split("T")[0],
        history: [{ date: new Date().toISOString().split("T")[0], value: 250 }],
      },
    ];
  }
}