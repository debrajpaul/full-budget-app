import * as cdk from "aws-cdk-lib";
import { Stack, StackProps, RemovalPolicy } from "aws-cdk-lib";
import { Table, AttributeType, BillingMode } from "aws-cdk-lib/aws-dynamodb";
import { Construct } from "constructs";
import { resolveStage } from "./stage-config";

export class RecurringTransactionsTableStack extends Stack {
  public readonly recurringTransactionsTable: Table;

  constructor(scope: Construct, id: string, props?: StackProps) {
    super(scope, id, props);
    const { stage } = resolveStage(this);

    this.recurringTransactionsTable = new Table(
      this,
      "RecurringTransactionsTable",
      {
        tableName: `recurring-transactions-${stage}`,
        partitionKey: {
          name: "tenantId",
          type: AttributeType.STRING,
        },
        sortKey: {
          name: "recurringId",
          type: AttributeType.STRING,
        },
        billingMode: BillingMode.PAY_PER_REQUEST,
        removalPolicy: RemovalPolicy.DESTROY,
      }
    );

    new cdk.CfnOutput(this, "RecurringTransactionsTableName", {
      value: this.recurringTransactionsTable.tableName,
      exportName: `RecurringTransactionsTableName-${stage}`,
    });
  }
}
