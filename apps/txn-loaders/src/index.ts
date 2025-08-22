import { SQSEvent } from "aws-lambda";
import { setupDependency } from "./setup-dependency";
import { setupServices } from "./setup-services";
import { setupLoaders } from "./setup-loaders";

const { logger, s3Client, sqsClient, dynamoDBDocumentClient } =
  setupDependency();

const { transactionService } = setupServices(
  logger,
  s3Client,
  sqsClient,
  dynamoDBDocumentClient,
);

const { transactionLoader } = setupLoaders(logger, transactionService);

export const handler = async (event: SQSEvent) => {
  logger.info(`#handler`);
  logger.debug(`handler event: ${JSON.stringify(event)}`);
  const result = await transactionLoader.loader(event.Records);
  logger.info(`handler result: ${JSON.stringify(result)}`);
  return result;
};
