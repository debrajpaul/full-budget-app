import { Stack, StackProps, CfnOutput } from 'aws-cdk-lib';
import { Construct } from 'constructs';
import { StringParameter } from 'aws-cdk-lib/aws-ssm';
import { GraphQLApiConstruct } from './graphql-api-construct';

interface GraphQLApiStackProps extends StackProps {
  uploadBucketArn: string;
  statementQueueArn: string;
  transactionTableArn: string;
  userTableArn: string;
  jwtParameter: StringParameter;
  environment: Record<string, string>;
}

export class GraphQLApiStack extends Stack {
  constructor(scope: Construct, id: string, props: GraphQLApiStackProps) {
    super(scope, id, props);

    const api = new GraphQLApiConstruct(this, 'GraphQLApi', {
      uploadBucketArn: props.uploadBucketArn,
      statementQueueArn: props.statementQueueArn,
      transactionTableArn: props.transactionTableArn,
      userTableArn: props.userTableArn,
      jwtParameter: props.jwtParameter,
      environment: props.environment,
    });

    new CfnOutput(this, 'GraphQLApiUrl', {
      value: api.apiUrl,
    });
  }
}
