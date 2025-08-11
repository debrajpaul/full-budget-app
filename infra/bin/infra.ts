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
} from '../lib';

const app = new App();
const ssmParamStack = new SsmParamStack(app, 'SsmParamStack');
const storageStack = new StorageStack(app, 'StorageStack');
const queueStack = new QueueStack(app, 'QueueStack');
const transactionsTableStack = new TransactionsTableStack(app, 'TransactionsTableStack');
const transactionsCategoryTableStack = new TransactionsCategoryTableStack(app, 'TransactionsCategoryTableStack');
const usersTableStack = new UsersTableStack(app, 'UsersTableStack');

new GraphQLApiStack(app, 'GraphQLApiStack', {
  uploadBucketArn: storageStack.uploadBucket.bucketArn,
  statementQueueArn: queueStack.statementProcessingQueue.queueArn,
  transactionTableArn: transactionsTableStack.transactionsTable.tableArn,
  userTableArn: usersTableStack.usersTable.tableArn,
  jwtParameter: ssmParamStack.parameter,
  environment: {
    NODE_ENV: 'dev',
    LOG_LEVEL: 'debug',
    DYNAMO_TRANSACTION_TABLE: transactionsTableStack.transactionsTable.tableName,
    DYNAMO_USER_TABLE: usersTableStack.usersTable.tableName,
    SQS_QUEUE_URL: queueStack.statementProcessingQueue.queueUrl,
    AWS_S3_BUCKET: storageStack.uploadBucket.bucketName,
  },
});

new TransactionLoaderStack(app, 'TransactionLoaderStack', {
  jobsQueue: queueStack.statementProcessingQueue,
  transactionTableArn: transactionsTableStack.transactionsTable.tableArn,
  jwtParameter: ssmParamStack.parameter,
  environment: {
    NODE_ENV: 'dev',
    LOG_LEVEL: 'debug',
    DYNAMO_TRANSACTION_TABLE: transactionsTableStack.transactionsTable.tableName,
    SQS_QUEUE_URL: queueStack.statementProcessingQueue.queueUrl,
    AWS_S3_BUCKET: storageStack.uploadBucket.bucketName,
  },
});

new TransactionCategoryStack(app, 'TransactionCategoryStack', {
  transactionTableArn: transactionsTableStack.transactionsTable,
  transactionsCategoryTableArn: transactionsCategoryTableStack.transactionsCategoryTable.tableArn,
  environment: {
    NODE_ENV: 'dev',
    LOG_LEVEL: 'debug',
    DYNAMO_TRANSACTION_TABLE: transactionsTableStack.transactionsTable.tableName,
    DYNAMO_TRANSACTION_CATEGORY_TABLE: transactionsCategoryTableStack.transactionsCategoryTable.tableName,
  },
});