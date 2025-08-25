import { DynamoDBStreamEvent } from "aws-lambda";
import { setupDependency } from "./setup-dependency";
import { setupServices } from "./setup-services";
import { setupLoaders } from "./setup-loaders";

const { logger, dynamoDBDocumentClient, comprehendClient } = setupDependency();

const { transactionCategoryService } = setupServices(
  logger,
  comprehendClient,
  dynamoDBDocumentClient,
);

const { transactionCategoryLoader } = setupLoaders(
  logger,
  transactionCategoryService,
);

export const handler = async (event: DynamoDBStreamEvent) => {
  logger.info(`#handler`);
  logger.debug(`handler event: ${JSON.stringify(event)}`);
  const result = await transactionCategoryLoader.handle(event.Records);
  logger.info(`handler result: ${JSON.stringify(result)}`);
  return result;
};
