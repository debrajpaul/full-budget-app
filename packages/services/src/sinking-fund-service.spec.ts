import { SinkingFundService } from "./sinking-fund-service";
import { mock } from "jest-mock-extended";
import { ILogger, ETenantType } from "@common";

describe("SinkingFundService", () => {
  const tenantId = ETenantType.default;
  const userId = "user-123";

  it("logs the fetch request and returns the placeholder sinking fund", async () => {
    const logger = mock<ILogger>();
    const service = new SinkingFundService(logger);

    const funds = await service.getSinkingFunds(tenantId, userId);

    expect(logger.debug).toHaveBeenCalledWith("Fetching sinking funds", {
      tenantId,
      userId,
    });

    expect(funds).toHaveLength(1);
    expect(funds[0]).toMatchObject({
      id: "sf-1",
      name: "Car Insurance",
      target: 600,
      current: 150,
      monthlyContribution: 50,
    });
    expect(funds[0].deadline).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  it("ensures the history mirrors the current snapshot", async () => {
    const logger = mock<ILogger>();
    const service = new SinkingFundService(logger);

    const [fund] = await service.getSinkingFunds(tenantId, userId);

    expect(fund.history).toHaveLength(1);
    const historyPoint = fund.history[0];

    expect(historyPoint.value).toBe(fund.current);
    expect(historyPoint.date).toBe(fund.deadline);
  });
});
