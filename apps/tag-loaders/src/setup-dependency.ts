import { config } from "./environment";
import { WinstonLogger } from "@logger";
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient } from "@aws-sdk/lib-dynamodb";

export function setupDependency() {
  const client = new DynamoDBClient({ region: config.awsRegion });
  const dynamoDBDocumentClient = DynamoDBDocumentClient.from(client);
  const logger = WinstonLogger.getInstance(config.logLevel);
  return {
    logger,
    dynamoDBDocumentClient,
  };
}
