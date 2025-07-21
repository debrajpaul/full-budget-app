import * as cdk from 'aws-cdk-lib';
import { Queue } from 'aws-cdk-lib/aws-sqs';
import { Stack, StackProps } from "aws-cdk-lib";
import { Construct } from 'constructs';

export class QueueStack extends Stack {
  public readonly statementProcessingQueue: Queue;

  constructor(scope: Construct, id: string, props?: StackProps) {
    super(scope, id, props);

    this.statementProcessingQueue = new Queue(this, 'StatementProcessingQueue', {
        queueName: 'statement-processing-queue',
        visibilityTimeout: cdk.Duration.seconds(300),
        retentionPeriod: cdk.Duration.days(4),
    });

    new cdk.CfnOutput(this, 'StatementQueueUrl', {
        value: this.statementProcessingQueue.queueUrl,
        exportName: 'StatementQueueUrl',
    });
  }
}
