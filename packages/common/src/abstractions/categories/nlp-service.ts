// Lightweight, provider-agnostic NLP types (no AWS SDK dependencies)
export type TNlpSentiment = "POSITIVE" | "NEGATIVE" | "NEUTRAL" | "MIXED";

export interface TNlpEntity {
  Text: string;
  Type?: string;
  Score?: number;
  BeginOffset?: number;
  EndOffset?: number;
}

export interface TNlpClass {
  Name: string;
  Score: number;
}

export interface INlpAnalysis {
  entities: TNlpEntity[];
  sentiment: TNlpSentiment;
  classification?: TNlpClass[];
}

export interface INlpService {
  analyzeDescription(description: string): Promise<INlpAnalysis>;
  classifyDescription(description: string): Promise<TNlpClass[]>;
}
