import * as cdk from "aws-cdk-lib";
import { Stack, StackProps } from "aws-cdk-lib";
import {
  Table,
  AttributeType,
  BillingMode,
  ProjectionType,
} from "aws-cdk-lib/aws-dynamodb";
import { Construct } from "constructs";

export class RefreshTokensTableStack extends Stack {
  public readonly refreshTokensTable: Table;

  constructor(scope: Construct, id: string, props?: StackProps) {
    super(scope, id, props);

    this.refreshTokensTable = new Table(this, "RefreshTokensTable", {
      tableName: "refresh-tokens",
      partitionKey: { name: "tokenId", type: AttributeType.STRING },
      billingMode: BillingMode.PAY_PER_REQUEST,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
      timeToLiveAttribute: "ttl",
    });

    // GSI used by revokeFamily to invalidate all tokens in a rotation chain.
    this.refreshTokensTable.addGlobalSecondaryIndex({
      indexName: "FamilyIndex",
      partitionKey: { name: "family", type: AttributeType.STRING },
      projectionType: ProjectionType.ALL,
    });

    new cdk.CfnOutput(this, "RefreshTokensTableName", {
      value: this.refreshTokensTable.tableName,
      exportName: "RefreshTokensTableName",
    });
  }
}
