import { config } from "./environment";
import { WinstonLogger } from "@logger";
import { S3 } from "@aws-sdk/client-s3";
import { SQS } from "@aws-sdk/client-sqs";
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { ComprehendClientConfig } from "@aws-sdk/client-comprehend";
import { DynamoDBDocumentClient } from "@aws-sdk/lib-dynamodb";
import { ComprehendClientFactory } from "@client";

export function setupDependency() {
  const client = new DynamoDBClient({ region: config.awsRegion });
  const dynamoDBDocumentClient = DynamoDBDocumentClient.from(client);
  const logger = WinstonLogger.getInstance(config.logLevel);
  const s3Client = new S3({
    region: config.awsRegion,
  });
  const sqsClient = new SQS({
    region: config.awsRegion,
  });
  const comprehendClientFactory = new ComprehendClientFactory(
    logger.child("ComprehendClient"),
    { region: config.awsRegion } as ComprehendClientConfig,
  );
  return {
    logger,
    s3Client,
    sqsClient,
    dynamoDBDocumentClient,
    comprehendClientFactory,
  };
}
