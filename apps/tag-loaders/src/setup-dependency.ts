import { config } from "./environment";
import { IBedrockClientConfig } from "@common";
import { WinstonLogger } from "@logger";
import { DynamoDBClient, DynamoDBClientConfig } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient } from "@aws-sdk/lib-dynamodb";
import {
  BedrockRuntimeClient,
  BedrockRuntimeClientConfig,
} from "@aws-sdk/client-bedrock-runtime";
import { BedrockClient } from "@client";

export function setupDependency() {
  const dynamoDbClientConfig: DynamoDBClientConfig = {
    region: config.awsRegion,
    ...(config.useLocalstack
      ? {
          endpoint: `http://${config.localstackHost}:${config.localstackEdgePort}`,
          credentials: {
            accessKeyId: config.awsAccessKeyId,
            secretAccessKey: config.awsSecretAccessKey,
          },
        }
      : {}),
  };
  const client = new DynamoDBClient(dynamoDbClientConfig);
  const dynamoDBDocumentClient = DynamoDBDocumentClient.from(client);
  const logger = WinstonLogger.getInstance(config.logLevel);
  const bedrockClientConfig: BedrockRuntimeClientConfig = {
    region: config.awsRegion,
  };
  const bedrock = new BedrockRuntimeClient(bedrockClientConfig);
  const bedrockClient = new BedrockClient(
    logger.child("BedrockClient"),
    bedrock,
    { modelId: config.bedrockModelId } as IBedrockClientConfig,
  );
  return {
    logger,
    dynamoDBDocumentClient,
    bedrockClient,
  };
}
