import {
  Stack,
  StackProps,
  Duration,
  aws_lambda as lambda,
  aws_iam as iam,
  aws_sqs as sqs,
  aws_s3 as s3,
} from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as path from 'path';
import * as eventSources from 'aws-cdk-lib/aws-lambda-event-sources';
import { LambdaAlarmsConstruct } from './lambda-alarms-construct';

interface TransactionLoaderStackProps extends StackProps {
  jobsQueue: sqs.Queue;
  uploadBucket: s3.Bucket;
  transactionTableArn: string;
  environment: Record<string, string>;
}

export class TransactionLoaderStack extends Stack {
  constructor(scope: Construct, id: string, props: TransactionLoaderStackProps) {
    super(scope, id, props);

    const transactionLambda = new lambda.Function(this, 'TransactionLambda', {
      functionName: 'TransactionLoader',
      runtime: lambda.Runtime.NODEJS_20_X,
      handler: 'index.handler',
      code: lambda.Code.fromAsset(path.resolve(__dirname, '../../apps/txn-loaders/dist')),
      timeout: Duration.seconds(30),
      logRetentionRetryOptions: { base: Duration.hours(8), maxRetries: 10 },
      tracing: lambda.Tracing.ACTIVE,
      environment: props.environment,
    });
  
    // Allow the function to write trace segments to X‑Ray
    transactionLambda.role?.addManagedPolicy(
      iam.ManagedPolicy.fromAwsManagedPolicyName('AWSXRayWriteOnlyAccess'),
    );

    // Attach queue trigger
    transactionLambda.addEventSource(
      new eventSources.SqsEventSource(props.jobsQueue, {
        batchSize: 10,
      })
    );

    props.jobsQueue.grantConsumeMessages(transactionLambda);

    // DynamoDB access
    transactionLambda.addToRolePolicy(
      new iam.PolicyStatement({
        actions: ['dynamodb:PutItem', 'dynamodb:UpdateItem', 'dynamodb:GetItem'],
        resources: [props.transactionTableArn],
      })
    );

    // s3 access
    transactionLambda.addToRolePolicy(
      new iam.PolicyStatement({
        actions: ['s3:PutObject', 's3:GetObject'],
        resources: [`${props.uploadBucket.bucketArn}/*`],
      })
    );

    props.uploadBucket.grantRead(transactionLambda);
    props.uploadBucket.grantWrite(transactionLambda);

    // Reusable monitoring
    new LambdaAlarmsConstruct(this, 'TransactionLoaderAlarms', {
      lambdaFn: transactionLambda,
      alarmPrefix: 'TransactionLoader',
    });
  }
}
