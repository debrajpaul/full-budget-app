import { config } from "./environment";
import { WinstonLogger } from "@logger";
import { S3, S3ClientConfig } from "@aws-sdk/client-s3";
import { SQS, SQSClientConfig } from "@aws-sdk/client-sqs";
import { DynamoDBClient, DynamoDBClientConfig } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient } from "@aws-sdk/lib-dynamodb";

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
  const s3ClientConfig: S3ClientConfig = {
    region: config.awsRegion,
    ...(config.useLocalstack
      ? {
          endpoint: `http://${config.localstackHost}:${config.localstackEdgePort}`,
          forcePathStyle: true,
          credentials: {
            accessKeyId: config.awsAccessKeyId,
            secretAccessKey: config.awsSecretAccessKey,
          },
        }
      : {}),
  };
  const s3Client = new S3(s3ClientConfig);
  const sqsClientConfig: SQSClientConfig = {
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
  const sqsClient = new SQS(sqsClientConfig);
  return {
    logger,
    s3Client,
    sqsClient,
    dynamoDBDocumentClient,
  };
}
