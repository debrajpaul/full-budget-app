import * as cdk from "aws-cdk-lib";
import { Stack, StackProps } from "aws-cdk-lib";
import { Table, AttributeType, BillingMode } from "aws-cdk-lib/aws-dynamodb";
import { Construct } from "constructs";

export class SavingsGoalsTableStack extends Stack {
  public readonly savingsGoalsTable: Table;

  constructor(scope: Construct, id: string, props?: StackProps) {
    super(scope, id, props);

    this.savingsGoalsTable = new Table(this, "SavingsGoalsTable", {
      tableName: "savings-goals",
      partitionKey: { name: "tenantId", type: AttributeType.STRING },
      sortKey: { name: "goalId", type: AttributeType.STRING },
      billingMode: BillingMode.PAY_PER_REQUEST,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
    });

    new cdk.CfnOutput(this, "SavingsGoalsTableName", {
      value: this.savingsGoalsTable.tableName,
      exportName: "SavingsGoalsTableName",
    });
  }
}
