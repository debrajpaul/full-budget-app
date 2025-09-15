import { ILogger, INlpService, INlpAnalysis, TNlpClass } from "@common";

export class NlpService implements INlpService {
  private readonly logger: ILogger;

  constructor(logger: ILogger) {
    this.logger = logger;
    this.logger.info("NlpService initialized (no external NLP provider)");
  }

  public async analyzeDescription(description: string): Promise<INlpAnalysis> {
    // Heuristic-only, provider-free implementation
    const text = description.trim().slice(0, 5000).toLowerCase();
    const sentiment: INlpAnalysis["sentiment"] =
      /refund|cashback|bonus|salary|credit/.test(text)
        ? "POSITIVE"
        : /failed|chargeback|penalty|late fee|overdue|debit/.test(text)
          ? "NEGATIVE"
          : "NEUTRAL";

    // No entity extraction without external provider
    const entities: INlpAnalysis["entities"] = [];

    return { entities, sentiment };
  }

  public async classifyDescription(description: string): Promise<TNlpClass[]> {
    // No external classifier; return empty predictions
    const data = description; // keep signature; avoid unused warning
    console.log("data", data);
    return [];
  }
}
