import { App } from 'aws-cdk-lib';
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
} from '../lib';

const app = new App();
const ssmParamStack = new SsmParamStack(app, 'SsmParamStack');
const storageStack = new StorageStack(app, 'StorageStack');
const queueStack = new QueueStack(app, 'QueueStack');
const transactionsTableStack = new TransactionsTableStack(app, 'TransactionsTableStack');
const transactionsCategoryTableStack = new TransactionsCategoryTableStack(app, 'TransactionsCategoryTableStack');
const recurringTransactionsTableStack = new RecurringTransactionsTableStack(app, 'RecurringTransactionsTableStack');
const usersTableStack = new UsersTableStack(app, 'UsersTableStack');

new GraphQLApiStack(app, 'GraphQLApiStack', {
  uploadBucketArn: storageStack.uploadBucket.bucketArn,
  statementQueueArn: queueStack.statementProcessingQueue.queueArn,
  transactionTableArn: transactionsTableStack.transactionsTable.tableArn,
  categoryTableArn: transactionsCategoryTableStack.transactionsCategoryTable.tableArn,
  recurringTableArn: recurringTransactionsTableStack.recurringTransactionsTable.tableArn,
  userTableArn: usersTableStack.usersTable.tableArn,
  jwtParameter: ssmParamStack.parameter,
  environment: {
    NODE_ENV: 'dev',
    LOG_LEVEL: 'debug',
    DYNAMO_CATEGORY_RULES_TABLE: transactionsCategoryTableStack.transactionsCategoryTable.tableName,
    DYNAMO_TRANSACTION_TABLE: transactionsTableStack.transactionsTable.tableName,
    DYNAMO_RECURRING_TABLE: recurringTransactionsTableStack.recurringTransactionsTable.tableName,
    DYNAMO_USER_TABLE: usersTableStack.usersTable.tableName,
    SQS_QUEUE_URL: queueStack.statementProcessingQueue.queueUrl,
    AWS_S3_BUCKET: storageStack.uploadBucket.bucketName,
    AI_TAGGING_ENABLED: 'true',
  },
});

new TransactionLoaderStack(app, 'TransactionLoaderStack', {
  jobsQueue: queueStack.statementProcessingQueue,
  uploadBucket: storageStack.uploadBucket,
  transactionTableArn: transactionsTableStack.transactionsTable.tableArn,
  environment: {
    NODE_ENV: 'dev',
    LOG_LEVEL: 'debug',
    DYNAMO_TRANSACTION_TABLE: transactionsTableStack.transactionsTable.tableName,
    SQS_QUEUE_URL: queueStack.statementProcessingQueue.queueUrl,
    AWS_S3_BUCKET: storageStack.uploadBucket.bucketName,
    AI_TAGGING_ENABLED: 'true',
  },
});

new TransactionCategoryStack(app, 'TransactionCategoryStack', {
  transactionTable: transactionsTableStack.transactionsTable,
  transactionsCategoryTable: transactionsCategoryTableStack.transactionsCategoryTable,
  environment: {
    NODE_ENV: 'dev',
    LOG_LEVEL: 'debug',
    DYNAMO_TRANSACTION_TABLE: transactionsTableStack.transactionsTable.tableName,
    DYNAMO_CATEGORY_RULES_TABLE: transactionsCategoryTableStack.transactionsCategoryTable.tableName,
    AI_TAGGING_ENABLED: 'true',
  },
});
