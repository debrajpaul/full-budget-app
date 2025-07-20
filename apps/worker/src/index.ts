import { config } from "./environment";
import { S3Service, SQSService } from "@client";
import { WinstonLogger } from "@logger";
import { S3 } from "@aws-sdk/client-s3";
import { SQS } from "@aws-sdk/client-sqs";
import { ProcessService } from "@services";
import { WorkLoader } from "./loader";

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

const app = new WorkLoader(logger.child("WorkLoader"), processService);

app.processMessages(
  config.dynamoTransactionTable,
  config.sqsQueueUrl,
  config.awsS3Bucket,
);
