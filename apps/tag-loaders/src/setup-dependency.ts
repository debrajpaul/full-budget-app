import { config } from "./environment";
import { WinstonLogger } from "@logger";
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { ComprehendClient } from "@aws-sdk/client-comprehend";
import { DynamoDBDocumentClient } from "@aws-sdk/lib-dynamodb";

export function setupDependency() {
  const client = new DynamoDBClient({ region: config.awsRegion });
  const dynamoDBDocumentClient = DynamoDBDocumentClient.from(client);
  const comprehendClient = new ComprehendClient({ region: config.awsRegion });
  const logger = WinstonLogger.getInstance(config.logLevel);
  return {
    logger,
    dynamoDBDocumentClient,
    comprehendClient,
  };
}
