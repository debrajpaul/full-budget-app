import { setupDependency } from "./setup-dependency";
import { setupServices } from "./setup-services";

const { logger, s3Client, sqsClient, dynamoDBDocumentClient } =
  setupDependency();

const { transactionService } = setupServices(
  logger,
  s3Client,
  sqsClient,
  dynamoDBDocumentClient,
);

async function processMessages() {
  logger.info("WorkLoader started processing messages");
  logger.info("Waiting for messages from SQS...");
  try {
    while (true) {
      let flag: boolean = await transactionService.processes();
      logger.info("Waiting for messages from SQS...");
      if (!flag) {
        await new Promise((res) => setTimeout(res, 2000));
        continue;
      }
    }
  } catch (err) {
    logger.error("Error processing message", err as Error);
    await new Promise((res) => setTimeout(res, 2000));
  }
}
processMessages();
