import * as cdk from 'aws-cdk-lib';
import { Stack, StackProps, RemovalPolicy } from "aws-cdk-lib";
import { Table, AttributeType, BillingMode } from 'aws-cdk-lib/aws-dynamodb';
import { Construct } from 'constructs';

export class TransactionsTableStack extends Stack {
  public readonly transactionsTable: Table;

  constructor(scope: Construct, id: string, props?: StackProps) {
    super(scope, id, props);

    this.transactionsTable = new Table(this, 'TransactionsTable', {
      tableName: 'transactions',
      partitionKey: {
        name: 'transactionId',
        type: AttributeType.STRING,
      },
      billingMode: BillingMode.PAY_PER_REQUEST, // OR BillingMode.PROVISIONED
      removalPolicy: RemovalPolicy.DESTROY, // for dev only; change for prod
    });

    // Optional TTL setup
    // this.transactionsTable.addTimeToLiveAttribute('expiresAt');

    new cdk.CfnOutput(this, 'UploadsTableName', {
      value: this.transactionsTable.tableName,
      exportName: 'UploadsTableName',
    });

  }
}
