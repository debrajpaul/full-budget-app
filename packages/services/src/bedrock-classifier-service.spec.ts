import { mock } from "jest-mock-extended";
import { BedrockClassifierService } from "./bedrock-classifier-service";
import { ILogger, IBedrockClient } from "@common";

describe("BedrockClassifierService", () => {
  let logger: ReturnType<typeof mock<ILogger>>;
  let bedrockClient: ReturnType<typeof mock<IBedrockClient>>;
  let service: BedrockClassifierService;

  const encodeBody = (obj: any): Uint8Array =>
    new TextEncoder().encode(JSON.stringify(obj));

  beforeEach(() => {
    logger = mock<ILogger>();
    bedrockClient = mock<IBedrockClient>();
    service = new BedrockClassifierService(logger, bedrockClient);
  });

  it("logs initialization on construction", () => {
    expect(logger.info).toHaveBeenCalledWith(
      "BedrockClassifierService initialized"
    );
  });

  it("returns normalized classification on valid response", async () => {
    const description = "Salary for August";
    const fakeResponse = {
      body: encodeBody({
        base: "income",
        sub: "salary",
        reason: "Employer payroll",
        confidence: 0.92,
      }),
    } as any;

    // Service awaits bedrockClient.invokeModel; mock a resolved value
    (bedrockClient.invokeModel as unknown as jest.Mock).mockResolvedValue(
      fakeResponse
    );

    const result = await service.classifyWithBedrock(description);

    expect(logger.info).toHaveBeenCalledWith(
      `Classifying transaction with description: ${description}`
    );
    expect(result).toEqual({
      base: "INCOME",
      sub: "SALARY",
      reason: "Employer payroll",
      confidence: 0.92,
    });
  });

  it("returns defaults when optional fields missing", async () => {
    const description = "Savings transfer";
    const fakeResponse = { body: encodeBody({ base: "savings" }) } as any;
    (bedrockClient.invokeModel as unknown as jest.Mock).mockResolvedValue(
      fakeResponse
    );

    const result = await service.classifyWithBedrock(description);

    expect(result).toEqual({
      base: "SAVINGS",
      sub: undefined,
      reason: "",
      confidence: 0.5,
    });
  });

  it("returns null when base is missing in response", async () => {
    const description = "Unknown description";
    const fakeResponse = { body: encodeBody({ reason: "n/a" }) } as any;
    (bedrockClient.invokeModel as unknown as jest.Mock).mockResolvedValue(
      fakeResponse
    );

    const result = await service.classifyWithBedrock(description);
    expect(result).toBeNull();
  });

  it("handles invalid JSON and logs error", async () => {
    const description = "Gibberish";
    const invalidJson = new TextEncoder().encode("not-json");
    const fakeResponse = { body: invalidJson } as any;
    (bedrockClient.invokeModel as unknown as jest.Mock).mockResolvedValue(
      fakeResponse
    );

    const result = await service.classifyWithBedrock(description);
    expect(result).toBeNull();
    expect(logger.error).toHaveBeenCalledWith(
      expect.stringContaining("Error classifying transaction:")
    );
  });

  it("handles rejected client promise and returns null", async () => {
    const description = "Should throw";
    (bedrockClient.invokeModel as unknown as jest.Mock).mockImplementationOnce(
      () => Promise.reject(new Error("bedrock down"))
    );

    const result = await service.classifyWithBedrock(description);
    expect(result).toBeNull();
    expect(logger.error).toHaveBeenCalledWith(
      expect.stringContaining("Error classifying transaction:")
    );
  });
});
