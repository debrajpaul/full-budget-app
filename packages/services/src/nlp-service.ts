import {
  ComprehendClient,
  DetectEntitiesCommand,
  DetectSentimentCommand,
  ClassifyDocumentCommand,
  DetectEntitiesCommandOutput,
  DetectSentimentCommandOutput,
  ClassifyDocumentCommandOutput,
} from "@aws-sdk/client-comprehend";
import { ILogger } from "@common";

export interface INlpAnalysis {
  entities: DetectEntitiesCommandOutput["Entities"];
  sentiment: DetectSentimentCommandOutput["Sentiment"];
  classification?: ClassifyDocumentCommandOutput["Classes"];
}

export class NlpService {
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

    const [entitiesResult, sentimentResult] = await Promise.all([
      this.comprehend.send(
        new DetectEntitiesCommand({ Text: text, LanguageCode: "en" }),
      ),
      this.comprehend.send(
        new DetectSentimentCommand({ Text: text, LanguageCode: "en" }),
      ),
    ]);

    let classificationResult: ClassifyDocumentCommandOutput | undefined;
    if (this.classifierArn) {
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
    }

    return {
      entities: entitiesResult.Entities ?? [],
      sentiment: sentimentResult.Sentiment ?? "NEUTRAL",
      classification: classificationResult?.Classes,
    };
  }
}