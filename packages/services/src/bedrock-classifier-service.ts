import { ILogger, IBedrockClient, IBedrockClassifierService } from "@common";
export class BedrockClassifierService implements IBedrockClassifierService {
  private readonly logger: ILogger;
  private readonly bedrockClient: IBedrockClient;

  constructor(logger: ILogger, bedrockClient: IBedrockClient) {
    this.logger = logger;
    this.bedrockClient = bedrockClient;
    this.logger.info("BedrockClassifierService initialized");
  }

  private buildResponse(response: any): {
    base: string;
    sub?: string;
    reason?: string;
    confidence?: number;
  } | null {
    const text = new TextDecoder("utf-8").decode(response.body as Uint8Array);
    const parsed = JSON.parse(text);

    if (!parsed?.base) return null;
    return {
      base: String(parsed.base).toUpperCase(),
      sub: parsed.sub ? String(parsed.sub).toUpperCase() : undefined,
      reason: parsed.reason ?? "",
      confidence: parsed.confidence ?? 0.5,
    };
  }

  async classifyWithBedrock(description: string): Promise<{
    base: string;
    sub?: string;
    reason?: string;
    confidence?: number;
  } | null> {
    try {
      this.logger.info(
        `Classifying transaction with description: ${description}`,
      );
      const response = await this.bedrockClient.invokeModel(description);
      const built = this.buildResponse(response);
      this.logger.debug("Bedrock classification parsed", built ?? {});
      return built;
    } catch (error) {
      this.logger.error(`Error classifying transaction: ${error}`);
      return Promise.resolve(null);
    }
  }
}
