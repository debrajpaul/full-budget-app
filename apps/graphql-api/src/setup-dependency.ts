import { config } from "./environment";
import { WinstonLogger } from "@logger";
import { S3 } from "@aws-sdk/client-s3";
import { SQS } from "@aws-sdk/client-sqs";
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient } from "@aws-sdk/lib-dynamodb";

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
  return {
    logger,
    s3Client,
    sqsClient,
    dynamoDBDocumentClient,
  };
}
