import * as cdk from 'aws-cdk-lib';
import { Stack, StackProps, RemovalPolicy } from 'aws-cdk-lib';
import { Table, AttributeType, BillingMode } from 'aws-cdk-lib/aws-dynamodb';
import { Construct } from 'constructs';

export class TransactionsCategoryTableStack extends Stack {
  public readonly transactionsCategoryTable: Table;

  constructor(scope: Construct, id: string, props?: StackProps) {
    super(scope, id, props);

    this.transactionsCategoryTable = new Table(this, 'TransactionsCategoryTable', {
      tableName: 'transactions',
      partitionKey: {
        name: 'tenantId', // Multi-tenant partitioning
        type: AttributeType.STRING,
      },
      sortKey: {
        name: 'ruleId', // Sort by rule ID within tenant
        type: AttributeType.STRING,
      },
      billingMode: BillingMode.PAY_PER_REQUEST,
      removalPolicy: RemovalPolicy.DESTROY, // For dev only
    });

    // Optional: enable TTL for data expiry
    // this.transactionsCategoryTable.addTimeToLiveAttribute('expiresAt');

    new cdk.CfnOutput(this, 'TransactionsCategoryTableName', {
      value: this.transactionsCategoryTable.tableName,
      exportName: 'TransactionsCategoryTableName',
    });
  }
}
