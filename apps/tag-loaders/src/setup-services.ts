import { ILogger } from "@common";
import { config } from "./environment";
import { TransactionCategoryService, NlpService } from "@services";
import { TransactionStore, CategoryRulesStore } from "@db";
import { DynamoDBDocumentClient } from "@aws-sdk/lib-dynamodb";

export function setupServices(
  logger: ILogger,
  dynamoDBDocumentClient: DynamoDBDocumentClient,
) {
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
  const nlpService = new NlpService(logger.child("NlpService"));
  const transactionCategoryService = new TransactionCategoryService(
    logger.child("TransactionCategoryService"),
    transactionStore,
    categoryRulesStore,
    nlpService,
    config.aiTaggingEnabled,
  );

  return {
    transactionCategoryService,
    nlpService,
  };
}
