import * as cdk from "aws-cdk-lib";
import { Queue } from "aws-cdk-lib/aws-sqs";
import { Stack, StackProps, RemovalPolicy } from "aws-cdk-lib";
import { Construct } from "constructs";
import { resolveStage } from "./stage-config";

export class QueueStack extends Stack {
  public readonly statementProcessingQueue: Queue;

  constructor(scope: Construct, id: string, props?: StackProps) {
    super(scope, id, props);
    const { stage } = resolveStage(this);

    this.statementProcessingQueue = new Queue(
      this,
      "StatementProcessingQueue",
      {
        queueName: `statement-processing-queue-${stage}`,
        visibilityTimeout: cdk.Duration.seconds(300),
        retentionPeriod: cdk.Duration.days(1),
        removalPolicy: RemovalPolicy.DESTROY, // for dev only; change for prod
      }
    );

    new cdk.CfnOutput(this, "StatementQueueUrl", {
      value: this.statementProcessingQueue.queueUrl,
      exportName: `StatementQueueUrl-${stage}`,
    });
  }
}
