import {
  ComprehendClient,
  DetectEntitiesCommand,
  DetectSentimentCommand,
  ClassifyDocumentCommand,
  ClassifyDocumentCommandOutput,
} from "@aws-sdk/client-comprehend";
import { ILogger, INlpService, INlpAnalysis } from "@common";

export class NlpService implements INlpService {
  private readonly logger: ILogger;
  private readonly comprehend: ComprehendClient;
  private readonly classifierArn?: string;

  constructor(
    logger: ILogger,
    comprehend: ComprehendClient,
    classifierArn?: string,
  ) {
    this.logger = logger;
    this.comprehend = comprehend;
    this.classifierArn = classifierArn;
    this.logger.info("NlpService initialized");
  }

  public async analyzeDescription(description: string): Promise<INlpAnalysis> {
    const text = description.trim().slice(0, 5000);
    const sentimentResult = await this.comprehend.send(
      new DetectSentimentCommand({ Text: text, LanguageCode: "en" }),
    );

    if (this.classifierArn) {
      let classificationResult: ClassifyDocumentCommandOutput | undefined;
      try {
        classificationResult = await this.comprehend.send(
          new ClassifyDocumentCommand({
            Text: text,
            EndpointArn: this.classifierArn,
          }),
        );
      } catch (err) {
        this.logger.error("ClassifyDocumentCommand failed", err as Error);
      }
      return {
        entities: [],
        sentiment: sentimentResult.Sentiment ?? "NEUTRAL",
        classification: classificationResult?.Classes,
      };
    }

    const entitiesResult = await this.comprehend.send(
      new DetectEntitiesCommand({ Text: text, LanguageCode: "en" }),
    );
    return {
      entities: entitiesResult.Entities ?? [],
      sentiment: sentimentResult.Sentiment ?? "NEUTRAL",
    };
  }

  public async classifyDescription(
    description: string,
  ): Promise<ClassifyDocumentCommandOutput["Classes"]> {
    const text = description.trim().slice(0, 5000);
    if (!this.classifierArn) {
      this.logger.warn("Classifier ARN not configured");
      return [];
    }
    try {
      const result = await this.comprehend.send(
        new ClassifyDocumentCommand({
          Text: text,
          EndpointArn: this.classifierArn,
        }),
      );
      return result.Classes ?? [];
    } catch (err) {
      this.logger.error("ClassifyDocumentCommand failed", err as Error);
      return [];
    }
  }
}
