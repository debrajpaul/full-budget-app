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

interface WorkerStackProps extends StackProps {
  jobsQueue: sqs.Queue;
  transactionTableArn: string;
  jwtParameter: StringParameter;
  environment: Record<string, string>;
}

export class WorkerStack extends Stack {
  constructor(scope: Construct, id: string, props: WorkerStackProps) {
    super(scope, id, props);

    const workerLambda = new lambda.Function(this, 'WorkerLambda', {
      functionName: 'TransactionWorker',
      runtime: lambda.Runtime.NODEJS_20_X,
      handler: 'index.handler',
      code: lambda.Code.fromAsset(path.resolve(__dirname, '../../apps/worker/dist')),
      timeout: Duration.seconds(30),
      environment: props.environment,
    });

    workerLambda.addEnvironment(
      'JWT_SECRET',
      props.jwtParameter.stringValue,
    );
    // Grant permission to read secret
    props.jwtParameter.grantRead(workerLambda);

    // Attach queue trigger
    workerLambda.addEventSource(
      new eventSources.SqsEventSource(props.jobsQueue, {
        batchSize: 10,
      })
    );

    props.jobsQueue.grantConsumeMessages(workerLambda);

    // DynamoDB access
    workerLambda.addToRolePolicy(
      new iam.PolicyStatement({
        actions: ['dynamodb:PutItem', 'dynamodb:UpdateItem', 'dynamodb:GetItem'],
        resources: [props.transactionTableArn],
      })
    );

    // Reusable monitoring
    new LambdaAlarmsConstruct(this, 'WorkerLambdaAlarms', {
      lambdaFn: workerLambda,
      alarmPrefix: 'TransactionWorker',
    });
  }
}
