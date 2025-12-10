import * as cdk from "aws-cdk-lib";
import { Stack, StackProps } from "aws-cdk-lib";
import { Table, AttributeType, BillingMode } from "aws-cdk-lib/aws-dynamodb";
import { Construct } from "constructs";

export class BudgetsTableStack extends Stack {
  public readonly budgetsTable: Table;

  constructor(scope: Construct, id: string, props?: StackProps) {
    super(scope, id, props);

    this.budgetsTable = new Table(this, "BudgetsTable", {
      tableName: "budgets",
      partitionKey: { name: "tenantId", type: AttributeType.STRING },
      sortKey: { name: "budgetId", type: AttributeType.STRING },
      billingMode: BillingMode.PAY_PER_REQUEST,
      removalPolicy: cdk.RemovalPolicy.DESTROY, // use RETAIN for production
    });

    new cdk.CfnOutput(this, "BudgetsTableName", {
      value: this.budgetsTable.tableName,
      exportName: "BudgetsTableName",
    });
  }
}
