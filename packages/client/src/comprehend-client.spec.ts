import { mock } from "jest-mock-extended";
import { ILogger } from "@common";
import { ComprehendClient, ComprehendClientConfig } from "@aws-sdk/client-comprehend";
import { ComprehendClientFactory } from "./comprehend-client";

describe("ComprehendClientFactory", () => {
  let mockLogger: ILogger;
  let factory: ComprehendClientFactory;

  beforeEach(() => {
    mockLogger = mock<ILogger>();
    factory = new ComprehendClientFactory(mockLogger, {} as ComprehendClientConfig);
  });

  it("should create a Comprehend client", async () => {
    const client = await factory.createClient();
    expect(client).toBeInstanceOf(ComprehendClient);
    expect(mockLogger.info).toHaveBeenCalledWith("Creating Comprehend client", { region: undefined });
  });

  it("should create a Comprehend client with region", async () => {
    const config = { region: "us-east-1" };
    factory = new ComprehendClientFactory(mockLogger, config);
    const client = await factory.createClient();
    expect(client).toBeInstanceOf(ComprehendClient);
    expect(mockLogger.info).toHaveBeenCalledWith("Creating Comprehend client", { region: "us-east-1" });
  });
});