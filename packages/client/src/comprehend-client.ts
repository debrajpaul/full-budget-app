import { ComprehendClient, ComprehendClientConfig } from "@aws-sdk/client-comprehend";
import { ILogger } from "@common";

export class ComprehendClientFactory {
  constructor(
    private readonly logger: ILogger,
    private readonly config: ComprehendClientConfig,
  ) {}

  async createClient(): Promise<ComprehendClient> {
    const region = this.config.region;
    this.logger.info("Creating Comprehend client", { region });
    return await new ComprehendClient({
      ...this.config,
      region,
    });
  }
}
