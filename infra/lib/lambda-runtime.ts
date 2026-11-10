import * as lambda from "aws-cdk-lib/aws-lambda";

// Single Node runtime for every backend Lambda. Keep in step with .nvmrc and the esbuild targets.
export const LAMBDA_NODE_RUNTIME = lambda.Runtime.NODEJS_24_X;
