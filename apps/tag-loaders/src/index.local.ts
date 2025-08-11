import { DynamoDBRecord } from "aws-lambda/trigger/dynamodb-stream";
import { setupDependency } from "./setup-dependency";
import { setupServices } from "./setup-services";

const { logger, dynamoDBDocumentClient } = setupDependency();

const { transactionCategoryService } = setupServices(
  logger,
  dynamoDBDocumentClient,
);

async function processMessages() {
  logger.info("WorkLoader started processing messages");
  logger.info("Waiting for messages from SQS...");
  try {
    while (true) {
      let flag: boolean = await transactionCategoryService.process(
        async (records: DynamoDBRecord[]) => {
          logger.info(`Handling ${records.length} records`);
          logger.debug("Handling records");
          for (const record of records) {
            logger.info(`Processing record: ${record.eventID}`);
            if (
              record.eventName !== "INSERT" &&
              record.eventName !== "MODIFY"
            ) {
              continue; // only process new or updated transactions
            }
            const newImage = record.dynamodb?.NewImage;
            if (!newImage) continue;
            await transactionCategoryService.process(newImage);
          }
        },
      );
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
