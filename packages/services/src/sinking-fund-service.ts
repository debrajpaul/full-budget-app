import {
  ILogger,
  ETenantType,
  ISinkingFund,
  ISinkingFundService,
} from "@common";

export class SinkingFundService implements ISinkingFundService {
  private readonly logger: ILogger;

  constructor(logger: ILogger) {
    this.logger = logger;
  }

  public async getSinkingFunds(
    tenantId: ETenantType,
    userId: string
  ): Promise<ISinkingFund[]> {
    this.logger.debug("Fetching sinking funds", { tenantId, userId });
    // Placeholder implementation
    const today = new Date().toISOString().split("T")[0];
    return [
      {
        id: "sf-1",
        name: "Car Insurance",
        target: 600,
        current: 150,
        monthlyContribution: 50,
        deadline: today,
        history: [{ date: today, value: 150 }],
      },
    ];
  }
}
