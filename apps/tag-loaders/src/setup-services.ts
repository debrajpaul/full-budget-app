import { ILogger, IBedrockClient } from "@common";
import { config } from "./environment";
import { RuleEngine } from "@nlp-tagger";
import { TransactionCategoryService, BedrockClassifierService } from "@services";
import { TransactionStore, CategoryRulesStore } from "@db";
import { DynamoDBDocumentClient } from "@aws-sdk/lib-dynamodb";

export function setupServices(
  logger: ILogger,
  dynamoDBDocumentClient: DynamoDBDocumentClient,
  bedrockClient:IBedrockClient
) {
  const ruleEngine = new RuleEngine(logger.child("RuleEngine"));
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
  const bedrockClassifierService = new BedrockClassifierService(
    logger.child("BedrockClassifierService"),
    bedrockClient,
  );
  const transactionCategoryService = new TransactionCategoryService(
    logger.child("TransactionCategoryService"),
    transactionStore,
    categoryRulesStore,
    ruleEngine,
    bedrockClassifierService,
    config.aiTaggingEnabled,
  );

  return {
    transactionCategoryService,
  };
}
