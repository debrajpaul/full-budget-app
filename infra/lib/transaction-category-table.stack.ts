import * as cdk from "aws-cdk-lib";
import { Stack, StackProps, RemovalPolicy } from "aws-cdk-lib";
import { Table, AttributeType, BillingMode } from "aws-cdk-lib/aws-dynamodb";
import { Construct } from "constructs";
import { resolveStage } from "./stage-config";

export class TransactionsCategoryTableStack extends Stack {
  public readonly transactionsCategoryTable: Table;

  constructor(scope: Construct, id: string, props?: StackProps) {
    super(scope, id, props);
    const { stage } = resolveStage(this);

    this.transactionsCategoryTable = new Table(
      this,
      "TransactionsCategoryTable",
      {
        tableName: `categories-${stage}`,
        partitionKey: {
          name: "tenantId", // Multi-tenant partitioning
          type: AttributeType.STRING,
        },
        sortKey: {
          name: "ruleId", // Sort by rule ID within tenant
          type: AttributeType.STRING,
        },
        billingMode: BillingMode.PAY_PER_REQUEST,
        removalPolicy: RemovalPolicy.DESTROY, // use RETAIN for production
      }
    );

    // Optional: enable TTL for data expiry
    // this.transactionsCategoryTable.addTimeToLiveAttribute('expiresAt');

    new cdk.CfnOutput(this, "TransactionsCategoryTableName", {
      value: this.transactionsCategoryTable.tableName,
      exportName: `TransactionsCategoryTableName-${stage}`,
    });
  }
}
