export interface IPromptInput {
  prompt: string;
  maxTokens: number;
}
export interface IBedrockClientConfig {
  modelId: string;
}

export interface IBedrockClient {
  invokeModel(description: string): Promise<any>;
}

export interface IBedrockClassifierService {
  classifyWithBedrock(description: string): Promise<{
    base: string;
    sub?: string;
    reason?: string;
    confidence?: number;
  } | null> 
}
