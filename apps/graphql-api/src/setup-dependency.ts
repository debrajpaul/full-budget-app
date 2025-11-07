import { config } from "./environment";
import { IBedrockClientConfig } from "@common";
import { WinstonLogger } from "@logger";
import { S3 } from "@aws-sdk/client-s3";
import { SQS } from "@aws-sdk/client-sqs";
import { DynamoDBClient, DynamoDBClientConfig } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient } from "@aws-sdk/lib-dynamodb";
import { BedrockRuntimeClient } from "@aws-sdk/client-bedrock-runtime";
import { BedrockClient } from "@client";

export function setupDependency() {
  const dynamoDbClientConfig: DynamoDBClientConfig = {
    region: config.awsRegion,
  };
  const client = new DynamoDBClient(dynamoDbClientConfig);
  const dynamoDBDocumentClient = DynamoDBDocumentClient.from(client);
  const logger = WinstonLogger.getInstance(config.logLevel);
  const s3Client = new S3({
    region: config.awsRegion,
  });
  const sqsClient = new SQS({
    region: config.awsRegion,
  });
  const bedrock = new BedrockRuntimeClient({ region: config.awsRegion });
  const bedrockClient = new BedrockClient(
    logger.child("BedrockClient"),
    bedrock,
    { modelId: config.bedrockModelId } as IBedrockClientConfig,
  );
  return {
    logger,
    s3Client,
    sqsClient,
    dynamoDBDocumentClient,
    bedrockClient,
  };
}
