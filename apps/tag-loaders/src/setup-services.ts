import { ILogger } from "@common";
import { config } from "./environment";
import { TransactionStore, CategoryRulesStore } from "@db";
import { TransactionCategoryService } from "@services";
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
  const transactionCategoryService = new TransactionCategoryService(
    logger.child("TransactionCategoryService"),
    transactionStore,
    categoryRulesStore,
  );

  return {
    transactionCategoryService,
  };
}
