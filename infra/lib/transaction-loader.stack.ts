import {
  Stack,
  StackProps,
  Duration,
  aws_lambda as lambda,
  aws_iam as iam,
  aws_sqs as sqs,
} from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as path from 'path';
import { StringParameter } from 'aws-cdk-lib/aws-ssm';
import * as eventSources from 'aws-cdk-lib/aws-lambda-event-sources';
import { LambdaAlarmsConstruct } from './lambda-alarms-construct';

interface TransactionLoaderStackProps extends StackProps {
  jobsQueue: sqs.Queue;
  transactionTableArn: string;
  jwtParameter: StringParameter;
  environment: Record<string, string>;
}

export class TransactionLoaderStack extends Stack {
  constructor(scope: Construct, id: string, props: TransactionLoaderStackProps) {
    super(scope, id, props);

    const transactionLambda = new lambda.Function(this, 'TransactionLambda', {
      functionName: 'TransactionLoader',
      runtime: lambda.Runtime.NODEJS_20_X,
      handler: 'index.handler',
      code: lambda.Code.fromAsset(path.resolve(__dirname, '../../apps/txn-loader/dist')),
      timeout: Duration.seconds(30),
      environment: props.environment,
    });

    transactionLambda.addEnvironment(
      'JWT_SECRET',
      props.jwtParameter.stringValue,
    );
    // Grant permission to read secret
    props.jwtParameter.grantRead(transactionLambda);

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

    // Reusable monitoring
    new LambdaAlarmsConstruct(this, 'TransactionLoaderAlarms', {
      lambdaFn: transactionLambda,
      alarmPrefix: 'TransactionLoader',
    });
  }
}
