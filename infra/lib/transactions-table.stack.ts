import * as cdk from "aws-cdk-lib";
import { Stack, StackProps, RemovalPolicy } from "aws-cdk-lib";
import {
  Table,
  AttributeType,
  BillingMode,
  StreamViewType,
} from "aws-cdk-lib/aws-dynamodb";
import { Construct } from "constructs";
import { resolveStage } from "./stage-config";

export class TransactionsTableStack extends Stack {
  public readonly transactionsTable: Table;

  constructor(scope: Construct, id: string, props?: StackProps) {
    super(scope, id, props);
    const { stage } = resolveStage(this);

    this.transactionsTable = new Table(this, "TransactionsTable", {
      tableName: `transactions-${stage}`,
      partitionKey: {
        name: "tenantId", // Multi-tenant partitioning
        type: AttributeType.STRING,
      },
      sortKey: {
        name: "transactionId", // Sort by transaction ID within tenant
        type: AttributeType.STRING,
      },
      stream: StreamViewType.NEW_IMAGE, // Enable streams for change data capture
      billingMode: BillingMode.PAY_PER_REQUEST,
      removalPolicy: RemovalPolicy.DESTROY, // use RETAIN for production
    });

    // Optional: enable TTL for data expiry
    // this.transactionsTable.addTimeToLiveAttribute('expiresAt');

    new cdk.CfnOutput(this, "TransactionsTableName", {
      value: this.transactionsTable.tableName,
      exportName: `TransactionsTableName-${stage}`,
    });
  }
}
