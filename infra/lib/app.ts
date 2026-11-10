import { App, StackProps } from "aws-cdk-lib";
import {
  StorageStack,
  QueueStack,
  TransactionsTableStack,
  UsersTableStack,
  GraphQLApiStack,
  TransactionLoaderStack,
  SsmParamStack,
  TransactionCategoryStack,
  TransactionsCategoryTableStack,
  RecurringTransactionsTableStack,
  BudgetsTableStack,
  SavingsGoalsTableStack,
  SinkingFundsTableStack,
  RefreshTokensTableStack,
  XRayStack,
} from "./index";
import { resolveStage } from "./stage-config";

// Builds every stack for the stage given in CDK context (-c stage=qa|prod).
// Stack IDs stay the same; the CloudFormation stack name carries the stage.
export function createApp(app: App): void {
  const stage = resolveStage(app);
  const stackProps = (id: string): StackProps => ({
    env: { region: stage.region, account: process.env.CDK_DEFAULT_ACCOUNT },
    stackName: `fba-${stage.stage}-${id}`,
    terminationProtection: stage.terminationProtection,
  });

  const ssmParamStack = new SsmParamStack(
    app,
    "SsmParamStack",
    stackProps("SsmParamStack")
  );
  const storageStack = new StorageStack(
    app,
    "StorageStack",
    stackProps("StorageStack")
  );
  const queueStack = new QueueStack(app, "QueueStack", stackProps("QueueStack"));
  const xRayStack = new XRayStack(app, "XRayStack", stackProps("XRayStack"));
  const transactionsTableStack = new TransactionsTableStack(
    app,
    "TransactionsTableStack",
    stackProps("TransactionsTableStack")
  );
  const transactionsCategoryTableStack = new TransactionsCategoryTableStack(
    app,
    "TransactionsCategoryTableStack",
    stackProps("TransactionsCategoryTableStack")
  );
  const recurringTransactionsTableStack = new RecurringTransactionsTableStack(
    app,
    "RecurringTransactionsTableStack",
    stackProps("RecurringTransactionsTableStack")
  );
  const budgetsTableStack = new BudgetsTableStack(
    app,
    "BudgetsTableStack",
    stackProps("BudgetsTableStack")
  );
  const savingsGoalsTableStack = new SavingsGoalsTableStack(
    app,
    "SavingsGoalsTableStack",
    stackProps("SavingsGoalsTableStack")
  );
  const sinkingFundsTableStack = new SinkingFundsTableStack(
    app,
    "SinkingFundsTableStack",
    stackProps("SinkingFundsTableStack")
  );
  const refreshTokensTableStack = new RefreshTokensTableStack(
    app,
    "RefreshTokensTableStack",
    stackProps("RefreshTokensTableStack")
  );
  const usersTableStack = new UsersTableStack(
    app,
    "UsersTableStack",
    stackProps("UsersTableStack")
  );

  new GraphQLApiStack(app, "GraphQLApiStack", {
    ...stackProps("GraphQLApiStack"),
    uploadBucketArn: storageStack.uploadBucket.bucketArn,
    statementQueueArn: queueStack.statementProcessingQueue.queueArn,
    transactionTableArn: transactionsTableStack.transactionsTable.tableArn,
    categoryTableArn:
      transactionsCategoryTableStack.transactionsCategoryTable.tableArn,
    recurringTableArn:
      recurringTransactionsTableStack.recurringTransactionsTable.tableArn,
    budgetTableArn: budgetsTableStack.budgetsTable.tableArn,
    savingsGoalTableArn: savingsGoalsTableStack.savingsGoalsTable.tableArn,
    sinkingFundTableArn: sinkingFundsTableStack.sinkingFundsTable.tableArn,
    refreshTokenTableArn: refreshTokensTableStack.refreshTokensTable.tableArn,
    userTableArn: usersTableStack.usersTable.tableArn,
    jwtParameter: ssmParamStack.parameter,
    environment: {
      NODE_ENV: stage.stage,
      LOG_LEVEL: stage.logLevel,
      DYNAMO_CATEGORY_RULES_TABLE:
        transactionsCategoryTableStack.transactionsCategoryTable.tableName,
      DYNAMO_TRANSACTION_TABLE:
        transactionsTableStack.transactionsTable.tableName,
      DYNAMO_RECURRING_TABLE:
        recurringTransactionsTableStack.recurringTransactionsTable.tableName,
      DYNAMO_BUDGET_TABLE: budgetsTableStack.budgetsTable.tableName,
      DYNAMO_SAVINGS_GOAL_TABLE: savingsGoalsTableStack.savingsGoalsTable.tableName,
      DYNAMO_SINKING_FUND_TABLE: sinkingFundsTableStack.sinkingFundsTable.tableName,
      DYNAMO_REFRESH_TOKEN_TABLE: refreshTokensTableStack.refreshTokensTable.tableName,
      DYNAMO_USER_TABLE: usersTableStack.usersTable.tableName,
      SQS_QUEUE_URL: queueStack.statementProcessingQueue.queueUrl,
      AWS_S3_BUCKET: storageStack.uploadBucket.bucketName,
      AI_TAGGING_ENABLED: String(stage.aiTaggingEnabled),
      BEDROCK_MODEL_ID: stage.bedrockModelId,
    },
  });

  new TransactionLoaderStack(app, "TransactionLoaderStack", {
    ...stackProps("TransactionLoaderStack"),
    jobsQueue: queueStack.statementProcessingQueue,
    uploadBucket: storageStack.uploadBucket,
    transactionTableArn: transactionsTableStack.transactionsTable.tableArn,
    environment: {
      NODE_ENV: stage.stage,
      LOG_LEVEL: stage.logLevel,
      DYNAMO_TRANSACTION_TABLE:
        transactionsTableStack.transactionsTable.tableName,
      SQS_QUEUE_URL: queueStack.statementProcessingQueue.queueUrl,
      AWS_S3_BUCKET: storageStack.uploadBucket.bucketName,
      AI_TAGGING_ENABLED: String(stage.aiTaggingEnabled),
      BEDROCK_MODEL_ID: stage.bedrockModelId,
    },
  });

  new TransactionCategoryStack(app, "TransactionCategoryStack", {
    ...stackProps("TransactionCategoryStack"),
    transactionTable: transactionsTableStack.transactionsTable,
    transactionsCategoryTable:
      transactionsCategoryTableStack.transactionsCategoryTable,
    environment: {
      NODE_ENV: stage.stage,
      LOG_LEVEL: stage.logLevel,
      DYNAMO_TRANSACTION_TABLE:
        transactionsTableStack.transactionsTable.tableName,
      DYNAMO_CATEGORY_RULES_TABLE:
        transactionsCategoryTableStack.transactionsCategoryTable.tableName,
      AI_TAGGING_ENABLED: String(stage.aiTaggingEnabled),
      BEDROCK_MODEL_ID: stage.bedrockModelId,
    },
  });
}
