import { Stack, StackProps, App } from 'aws-cdk-lib';
import { Construct } from 'constructs';
import { Table, AttributeType, BillingMode } from 'aws-cdk-lib/aws-dynamodb';
import { Bucket } from 'aws-cdk-lib/aws-s3';
import { Queue } from 'aws-cdk-lib/aws-sqs';

class BudgetInfraStack extends Stack {
  constructor(scope: Construct, id: string, props?: StackProps) {
    super(scope, id, props);

    // ✅ DynamoDB Table
    new Table(this, 'UsersTable', {
      tableName: 'users',
      partitionKey: {
        name: 'userId',
        type: AttributeType.STRING,
      },
      billingMode: BillingMode.PAY_PER_REQUEST, // Free tier friendly
      removalPolicy: RemovalPolicy.DESTROY, // Only for dev
    });

    // ✅ S3 Bucket
    new Bucket(this, 'UploadBucket', {
      bucketName: 'full-budget-bank-uploads',
      removalPolicy: RemovalPolicy.DESTROY, // Only for dev
      autoDeleteObjects: true,
    });

    // ✅ SQS Queue
    new Queue(this, 'BankStatementQueue', {
      queueName: 'bank-statement-jobs',
    });
  }
}

const app = new App();
new BudgetInfraStack(app, 'FullBudgetInfraStack', {
  env: {
    region: 'ap-south-1', // Set your preferred region
  },
});
