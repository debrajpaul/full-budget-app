import { ILogger } from "@common";
import { config } from "./environment";
import { S3 } from "@aws-sdk/client-s3";
import { SQS } from "@aws-sdk/client-sqs";
import { TransactionStore } from "@db";
import { TransactionService } from "@services";
import { S3Service, SQSService } from "@client";
import { DynamoDBDocumentClient } from "@aws-sdk/lib-dynamodb";

export function setupServices(
  logger: ILogger,
  s3Client: S3,
  sqsClient: SQS,
  dynamoDBDocumentClient: DynamoDBDocumentClient
) {
  const s3Service = new S3Service(
    logger.child("S3Service"),
    config.awsS3Bucket,
    s3Client
  );
  const sqsService = new SQSService(
    logger.child("SQSService"),
    config.sqsQueueUrl,
    sqsClient
  );
  const transactionStore = new TransactionStore(
    logger.child("TransactionStore"),
    config.dynamoTransactionTable,
    dynamoDBDocumentClient
  );
  const transactionService = new TransactionService(
    logger.child("TransactionService"),
    s3Service,
    sqsService,
    transactionStore
  );

  return {
    transactionService,
  };
}
