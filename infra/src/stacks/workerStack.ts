import { Stack, StackProps, Duration } from "aws-cdk-lib";
import { Construct } from "constructs";
import * as lambda from "aws-cdk-lib/aws-lambda";
import * as sqs from "aws-cdk-lib/aws-sqs";
import * as eventSources from "aws-cdk-lib/aws-lambda-event-sources";
import * as iam from "aws-cdk-lib/aws-iam";

export class WorkerStack extends Stack {
  public readonly jobsQueue: sqs.Queue;

  constructor(scope: Construct, id: string, props?: StackProps) {
    super(scope, id, props);

    // SQS Queue
    this.jobsQueue = new sqs.Queue(this, "JobsQueue", {
      queueName: "TransactionJobsQueue",
      visibilityTimeout: Duration.seconds(60),
    });

    // Lambda Function
    const workerLambda = new lambda.Function(this, "WorkerLambda", {
      functionName: "TransactionWorker",
      runtime: lambda.Runtime.NODEJS_20_X,
      handler: "index.handler",
      code: lambda.Code.fromAsset("dist/worker"), // make sure this path exists after build
      environment: {
        TABLE_NAME: "YourTransactionTable", // Replace with actual name or stack reference
      },
      timeout: Duration.seconds(30),
    });

    // Add SQS Event Source
    workerLambda.addEventSource(
      new eventSources.SqsEventSource(this.jobsQueue, {
        batchSize: 10, // adjust as needed
      })
    );

    // Grant Lambda permissions to read from the queue
    this.jobsQueue.grantConsumeMessages(workerLambda);

    // (Optional) Grant access to DynamoDB table
    workerLambda.addToRolePolicy(
      new iam.PolicyStatement({
        actions: ["dynamodb:PutItem", "dynamodb:UpdateItem", "dynamodb:GetItem"],
        resources: ["arn:aws:dynamodb:*:*:table/YourTransactionTable"],
      })
    );
  }
}
