import { mock } from "jest-mock-extended";
import { BedrockClient } from "./bedrock-client";
import { ILogger, IBedrockClientConfig } from "@common";
import {
  BedrockRuntimeClient,
  InvokeModelCommand,
} from "@aws-sdk/client-bedrock-runtime";

describe("BedrockClient", () => {
  let loggerMock: ReturnType<typeof mock<ILogger>>;
  let bedrock: BedrockRuntimeClient;
  let config: IBedrockClientConfig;
  let client: BedrockClient;

  beforeEach(() => {
    loggerMock = mock<ILogger>();
    bedrock = new BedrockRuntimeClient({});
    jest.spyOn(bedrock, "send").mockImplementation(jest.fn());
    config = { modelId: "test-model-id" };
    client = new BedrockClient(loggerMock, bedrock, config);
  });

  it("logs initialization and config on construction", () => {
    // Called during beforeEach constructor
    expect(loggerMock.info).toHaveBeenCalledWith("BedrockClient initialized");
    expect(loggerMock.info).toHaveBeenCalledWith("BedrockClient config", {
      bedrockClientConfig: config,
    });
  });

  it("should build and send InvokeModelCommand with correct input and return raw response", async () => {
    const description = "Test transaction at Store X";
    const fakeResponse = { body: new Uint8Array([123, 125]) } as any; // "{}"
    (bedrock.send as jest.Mock).mockResolvedValue(fakeResponse);

    const result = await client.invokeModel(description);

    // Sends command via Bedrock client
    expect(bedrock.send).toHaveBeenCalledTimes(1);
    const calledWith = (bedrock.send as jest.Mock).mock.calls[0][0];
    expect(calledWith).toBeInstanceOf(InvokeModelCommand);

    // Validate command input
    const input = (calledWith as InvokeModelCommand).input as any;
    expect(input.modelId).toBe(config.modelId);
    expect(input.contentType).toBe("application/json");
    expect(input.accept).toBe("application/json");

    // Body should be JSON string with prompt and maxTokens
    const body = input.body;
    const text =
      typeof body === "string"
        ? body
        : body instanceof Uint8Array
          ? new TextDecoder("utf-8").decode(body)
          : String(body);
    const parsed = JSON.parse(text);
    expect(parsed.maxTokens).toBe(150);
    expect(parsed.prompt).toEqual(expect.any(String));
    expect(parsed.prompt).toContain("bank transaction classifier");
    expect(parsed.prompt).toContain("subCategory");
    expect(parsed.prompt).toContain(`Description: ${description}`);

    // Logs invocation
    expect(loggerMock.info).toHaveBeenCalledWith(
      `Invoking model with description: ${description}`,
    );

    // Returns raw response from bedrock.send
    expect(result).toBe(fakeResponse);
  });
});
