import { config } from "./environment";
import { SQSEvent } from "aws-lambda";
import { WinstonLogger } from "@logger";
import { S3 } from "@aws-sdk/client-s3";
import { SQS } from "@aws-sdk/client-sqs";
import { ProcessService } from "@services";
import { S3Service, SQSService } from "@client";

const logger = WinstonLogger.getInstance(config.logLevel);
const s3Client = new S3({
  region: config.awsRegion,
});
const sqsClient = new SQS({
  region: config.awsRegion,
});
const s3Service = new S3Service(logger.child("S3Service"), s3Client);
const sqsService = new SQSService(logger.child("SQSService"), sqsClient);
const processService = new ProcessService(
  logger.child("ProcessService"),
  s3Service,
  sqsService,
);

export const handler = async (event: SQSEvent) => {
  logger.info(`#handler`);
  logger.debug(`handler event: ${JSON.stringify(event)}`);
  await processService.processes(event);
};
