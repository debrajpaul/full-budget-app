import { config } from "./environment";
import { IBedrockClientConfig } from "@common";
import { WinstonLogger } from "@logger";
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient } from "@aws-sdk/lib-dynamodb";
import { BedrockRuntimeClient } from "@aws-sdk/client-bedrock-runtime";
import { BedrockClient } from "@client";

export function setupDependency() {
  const client = new DynamoDBClient({ region: config.awsRegion });
  const dynamoDBDocumentClient = DynamoDBDocumentClient.from(client);
  const logger = WinstonLogger.getInstance(config.logLevel);
  const bedrock = new BedrockRuntimeClient({ region: config.awsRegion });
  const bedrockClient = new BedrockClient(logger.child("BedrockClient"), bedrock,{ modelId: config.bedrockModelId} as IBedrockClientConfig);
  return {
    logger,
    dynamoDBDocumentClient,
    bedrockClient
  };
}
