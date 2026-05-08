import * as cdk from "aws-cdk-lib";
import { Stack, StackProps } from "aws-cdk-lib";
import { Table, AttributeType, BillingMode } from "aws-cdk-lib/aws-dynamodb";
import { Construct } from "constructs";

export class SinkingFundsTableStack extends Stack {
  public readonly sinkingFundsTable: Table;

  constructor(scope: Construct, id: string, props?: StackProps) {
    super(scope, id, props);

    this.sinkingFundsTable = new Table(this, "SinkingFundsTable", {
      tableName: "sinking-funds",
      partitionKey: { name: "tenantId", type: AttributeType.STRING },
      sortKey: { name: "fundId", type: AttributeType.STRING },
      billingMode: BillingMode.PAY_PER_REQUEST,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
    });

    new cdk.CfnOutput(this, "SinkingFundsTableName", {
      value: this.sinkingFundsTable.tableName,
      exportName: "SinkingFundsTableName",
    });
  }
}
