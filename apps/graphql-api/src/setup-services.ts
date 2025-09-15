import { ILogger } from "@common";
import { config } from "./environment";
import { S3 } from "@aws-sdk/client-s3";
import { SQS } from "@aws-sdk/client-sqs";
import {
  TransactionStore,
  UserStore,
  CategoryRulesStore,
  RecurringTransactionStore,
  BudgetStore,
} from "@db";
import {
  TransactionService,
  AuthorizationService,
  UploadStatementService,
  TransactionCategoryService,
  NlpService,
  SavingsGoalService,
  SinkingFundService,
  ForecastService,
  RecurringTransactionService,
  BudgetService,
} from "@services";
import { S3Service, SQSService } from "@client";
import { DynamoDBDocumentClient } from "@aws-sdk/lib-dynamodb";

export function setupServices(
  logger: ILogger,
  s3Client: S3,
  sqsClient: SQS,
  dynamoDBDocumentClient: DynamoDBDocumentClient,
) {
  const s3Service = new S3Service(
    logger.child("S3Service"),
    config.awsS3Bucket,
    s3Client,
  );
  const sqsService = new SQSService(
    logger.child("SQSService"),
    config.sqsQueueUrl,
    sqsClient,
  );
  const userStore = new UserStore(
    logger.child("UserStore"),
    config.dynamoUserTable,
    dynamoDBDocumentClient,
  );
  const transactionStore = new TransactionStore(
    logger.child("TransactionStore"),
    config.dynamoTransactionTable,
    dynamoDBDocumentClient,
  );
  const categoryRulesStore = new CategoryRulesStore(
    logger.child("CategoryRulesStore"),
    config.dynamoCategoryRulesTable,
    dynamoDBDocumentClient,
  );
  const recurringStore = new RecurringTransactionStore(
    logger.child("RecurringTransactionStore"),
    config.dynamoRecurringTable,
    dynamoDBDocumentClient,
  );
  const budgetStore = new BudgetStore(
    logger.child("BudgetStore"),
    config.dynamoBudgetTable,
    dynamoDBDocumentClient,
  );
  const authorizationService = new AuthorizationService(
    logger.child("AuthorizationService"),
    config.jwtSecret,
    userStore,
  );
  const uploadStatementService = new UploadStatementService(
    logger.child("UploadStatementService"),
    s3Service,
    sqsService,
  );
  const transactionService = new TransactionService(
    logger.child("TransactionService"),
    s3Service,
    sqsService,
    transactionStore,
  );
  const nlpService = new NlpService(logger.child("NlpService"));
  const transactionCategoryService = new TransactionCategoryService(
    logger.child("TransactionCategoryService"),
    transactionStore,
    categoryRulesStore,
    nlpService,
    config.aiTaggingEnabled,
  );

  const savingsGoalService = new SavingsGoalService(
    logger.child("SavingsGoalService"),
  );
  const sinkingFundService = new SinkingFundService(
    logger.child("SinkingFundService"),
  );
  const recurringTransactionService = new RecurringTransactionService(
    logger.child("RecurringTransactionService"),
    recurringStore,
    transactionStore,
  );
  const forecastService = new ForecastService(
    logger.child("ForecastService"),
    recurringStore,
  );
  const budgetService = new BudgetService(
    logger.child("BudgetService"),
    budgetStore,
    transactionStore,
  );

  return {
    transactionService,
    authorizationService,
    uploadStatementService,
    transactionCategoryService,
    savingsGoalService,
    sinkingFundService,
    forecastService,
    nlpService,
    recurringTransactionService,
    budgetService,
  };
}
