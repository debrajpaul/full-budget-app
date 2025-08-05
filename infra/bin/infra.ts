import { App } from 'aws-cdk-lib';
import { 
  StorageStack, 
  QueueStack, 
  TransactionsTableStack, 
  UsersTableStack, 
  GraphQLApiStack, 
  WorkerStack,
  SsmParamStack,
} from '../lib';

const app = new App();
const ssmParamStack = new SsmParamStack(app, 'SsmParamStack');
const storageStack = new StorageStack(app, 'StorageStack');
const queueStack = new QueueStack(app, 'QueueStack');
const transactionsTableStack = new TransactionsTableStack(app, 'TransactionsTableStack');
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
    DYNAMO_TRANSACTION_TABLE: 'transactions',
    DYNAMO_USER_TABLE: 'users',
    SQS_QUEUE_URL: queueStack.statementProcessingQueue.queueUrl,
    AWS_S3_BUCKET: storageStack.uploadBucket.bucketName,
  },
});

new WorkerStack(app, 'WorkerStack', {
  jobsQueue: queueStack.statementProcessingQueue,
  transactionTableArn: transactionsTableStack.transactionsTable.tableArn,
  jwtParameter: ssmParamStack.parameter,
  environment: {
    NODE_ENV: 'dev',
    LOG_LEVEL: 'debug',
    DYNAMO_TRANSACTION_TABLE: 'transactions',
    SQS_QUEUE_URL: queueStack.statementProcessingQueue.queueUrl,
    AWS_S3_BUCKET: storageStack.uploadBucket.bucketName,
  },
});