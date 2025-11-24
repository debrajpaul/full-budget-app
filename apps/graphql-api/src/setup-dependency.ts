import { config } from "./environment";
import { IBedrockClientConfig } from "@common";
import { WinstonLogger } from "@logger";
import { S3, S3ClientConfig } from "@aws-sdk/client-s3";
import { SQS, SQSClientConfig } from "@aws-sdk/client-sqs";
import { DynamoDBClient, DynamoDBClientConfig } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient } from "@aws-sdk/lib-dynamodb";
import { BedrockRuntimeClient } from "@aws-sdk/client-bedrock-runtime";
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
  const dbClient = new DynamoDBClient(dynamoDbClientConfig);
  const dynamoDBDocumentClient = DynamoDBDocumentClient.from(dbClient);
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
