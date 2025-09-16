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
