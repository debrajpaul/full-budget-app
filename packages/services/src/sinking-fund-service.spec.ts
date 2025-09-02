import { SinkingFundService } from "./sinking-fund-service";
import { mock } from "jest-mock-extended";
import { ILogger, ETenantType } from "@common";

describe("SinkingFundService", () => {
  it("returns default sinking funds", async () => {
    const logger = mock<ILogger>();
    const service = new SinkingFundService(logger);
    const funds = await service.getSinkingFunds(ETenantType.default, "user");
    expect(funds).toHaveLength(1);
    expect(funds[0]).toHaveProperty("id");
  });
});
