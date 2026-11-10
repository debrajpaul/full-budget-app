import * as cdk from "aws-cdk-lib";
import { Stack, StackProps, RemovalPolicy } from "aws-cdk-lib";
import { Table, AttributeType, BillingMode } from "aws-cdk-lib/aws-dynamodb";
import { Construct } from "constructs";
import { resolveStage } from "./stage-config";

export class UsersTableStack extends Stack {
  public readonly usersTable: Table;

  constructor(scope: Construct, id: string, props?: StackProps) {
    super(scope, id, props);
    const { stage } = resolveStage(this);

    this.usersTable = new Table(this, "UsersTable", {
      tableName: `users-${stage}`,
      partitionKey: {
        name: "tenantId",
        type: AttributeType.STRING,
      },
      sortKey: {
        name: "email",
        type: AttributeType.STRING,
      },
      billingMode: BillingMode.PAY_PER_REQUEST,
      removalPolicy: RemovalPolicy.DESTROY, // use RETAIN for production
    });

    new cdk.CfnOutput(this, "UsersTableName", {
      value: this.usersTable.tableName,
      exportName: `UsersTableName-${stage}`,
    });
  }
}
