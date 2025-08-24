import { ILogger } from "@common";
import { config } from "./environment";
import { TransactionCategoryService } from "@services";
import { TransactionStore, CategoryRulesStore } from "@db";
import { DynamoDBDocumentClient } from "@aws-sdk/lib-dynamodb";
import { ComprehendClient } from "@aws-sdk/client-comprehend";

export function setupServices(
  logger: ILogger,
  comprehendClient: ComprehendClient,
  dynamoDBDocumentClient: DynamoDBDocumentClient,
) {
  void comprehendClient;
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
