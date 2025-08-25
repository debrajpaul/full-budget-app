import {
  DetectEntitiesCommandOutput,
  DetectSentimentCommandOutput,
  ClassifyDocumentCommandOutput,
} from "@aws-sdk/client-comprehend";

export interface INlpAnalysis {
  entities: DetectEntitiesCommandOutput["Entities"];
  sentiment: DetectSentimentCommandOutput["Sentiment"];
  classification?: ClassifyDocumentCommandOutput["Classes"];
}

export interface INlpService {
  analyzeDescription(description: string): Promise<INlpAnalysis>;
  classifyDescription(description: string): Promise<ClassifyDocumentCommandOutput["Classes"]>;
}