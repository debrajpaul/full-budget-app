import {
  Stack,
  StackProps,
  Duration,
  aws_lambda as lambda,
  aws_iam as iam,
} from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as path from 'path';
import { Table } from 'aws-cdk-lib/aws-dynamodb';
import * as eventSources from 'aws-cdk-lib/aws-lambda-event-sources';
import { LambdaAlarmsConstruct } from './lambda-alarms-construct';

interface TransactionCategoryStackProps extends StackProps {
  transactionTableArn: Table;
  transactionsCategoryTableArn: string;
  environment: Record<string, string>;
}

export class TransactionCategoryStack extends Stack {
  constructor(scope: Construct, id: string, props: TransactionCategoryStackProps) {
    super(scope, id, props);

    const transactionCategoryLambda = new lambda.Function(this, 'TransactionCategoryLambda', {
      functionName: 'TransactionCategoryLoader',
      runtime: lambda.Runtime.NODEJS_20_X,
      handler: 'index.handler',
      code: lambda.Code.fromAsset(path.resolve(__dirname, '../../apps/tag-loader/dist')),
      timeout: Duration.seconds(30),
      environment: props.environment,
    });

    // Attach queue trigger
    transactionCategoryLambda.addEventSource(
      new eventSources.DynamoEventSource(props.transactionTableArn, {
        startingPosition: lambda.StartingPosition.LATEST,
        batchSize: 10,
      })
    );

    // DynamoDB access
    transactionCategoryLambda.addToRolePolicy(
      new iam.PolicyStatement({
        actions: ['dynamodb:PutItem', 'dynamodb:UpdateItem', 'dynamodb:GetItem'],
        resources: [props.transactionsCategoryTableArn],
      })
    );

    // Reusable monitoring
    new LambdaAlarmsConstruct(this, 'TransactionCategoryLoaderAlarms', {
      lambdaFn: transactionCategoryLambda,
      alarmPrefix: 'TransactionCategoryLoader',
    });
  }
}
