import * as path from 'path';
import { Construct } from 'constructs';
import {
  Duration,
  aws_lambda as lambda,
  aws_apigateway as apigateway,
  aws_iam as iam,
} from 'aws-cdk-lib';
import { StringParameter } from 'aws-cdk-lib/aws-ssm';
import { LambdaAlarmsConstruct } from './lambda-alarms-construct';

export interface GraphQLApiConstructProps {
  uploadBucketArn: string;
  statementQueueArn: string;
  transactionTableArn: string;
  categoryTableArn: string;
  userTableArn: string;
  recurringTableArn: string;
  budgetTableArn: string;
  jwtParameter: StringParameter;
  environment: Record<string, string>;
}

export class GraphQLApiConstruct extends Construct {
  public readonly apiUrl: string;

  constructor(scope: Construct, id: string, props: GraphQLApiConstructProps) {
    super(scope, id);

    const graphqlFunction = new lambda.Function(this, 'GraphQLLambda', {
      runtime: lambda.Runtime.NODEJS_20_X,
      handler: 'index.handler',
      code: lambda.Code.fromAsset(path.resolve(__dirname, '../../apps/graphql-api/dist')), // Adjust to match your output dir
      memorySize: 1024,
      timeout: Duration.seconds(15),
      environment: props.environment,
    });
    graphqlFunction.addEnvironment(
      'JWT_SECRET',
      props.jwtParameter.stringValue,
    );

    // Grant Lambda permission to read the secret
    props.jwtParameter.grantRead(graphqlFunction);
    // Permissions
    graphqlFunction.addToRolePolicy(
      new iam.PolicyStatement({
        actions: ['dynamodb:*'],
        resources: [props.transactionTableArn, props.userTableArn, props.categoryTableArn, props.recurringTableArn, props.budgetTableArn],
      }),
    );

    graphqlFunction.addToRolePolicy(
      new iam.PolicyStatement({
        actions: ['s3:GetObject', 's3:PutObject'],
        resources: [`${props.uploadBucketArn}/*`],
      }),
    );

    graphqlFunction.addToRolePolicy(
      new iam.PolicyStatement({
        actions: ['sqs:SendMessage'],
        resources: [props.statementQueueArn],
      }),
    );

    new LambdaAlarmsConstruct(this, 'GraphQLLambdaAlarms', {
      lambdaFn: graphqlFunction,
      alarmPrefix: 'GraphQLLambda',
    });

    // API Gateway
    const api = new apigateway.RestApi(this, 'GraphQLApiGateway', {
      restApiName: 'GraphQL API',
      deployOptions: { stageName: props.environment.NODE_ENV || 'dev' },
      description: 'GraphQL API for Full Budget App',
      defaultCorsPreflightOptions: {
        allowOrigins: apigateway.Cors.ALL_ORIGINS,
        allowMethods: ['POST', 'OPTIONS'],
        allowHeaders: ['Content-Type', 'Authorization'],
      },
    });

    const graphql = api.root.addResource('graphql');
    graphql.addMethod('POST', new apigateway.LambdaIntegration(graphqlFunction, { proxy: true }));

    this.apiUrl = `${api.url}graphql`;
  }
}
