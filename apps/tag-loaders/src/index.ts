import { DynamoDBStreamEvent, DynamoDBBatchResponse } from "aws-lambda";
import { setupDependency } from "./setup-dependency";
import { setupServices } from "./setup-services";
import { setupLoaders } from "./setup-loaders";

const { logger, dynamoDBDocumentClient, bedrockClient } = setupDependency();

const { transactionCategoryService } = setupServices(
  logger,
  dynamoDBDocumentClient,
  bedrockClient,
);

const { transactionCategoryLoader } = setupLoaders(
  logger,
  transactionCategoryService,
);

export const handler = async (
  event: DynamoDBStreamEvent,
): Promise<DynamoDBBatchResponse> => {
  logger.debug(`handler event: ${JSON.stringify(event)}`);
  const result = await transactionCategoryLoader.loader(event.Records);
  return result;
};
