import * as cdk from "aws-cdk-lib";
import { Stack, StackProps, RemovalPolicy } from "aws-cdk-lib";
import { Bucket, BucketEncryption, HttpMethods } from "aws-cdk-lib/aws-s3";
import { Construct } from "constructs";
import { resolveStage } from "./stage-config";

export class StorageStack extends Stack {
  public readonly uploadBucket: Bucket;

  constructor(scope: Construct, id: string, props?: StackProps) {
    super(scope, id, props);
    const { stage } = resolveStage(this);

    this.uploadBucket = new Bucket(this, "UploadStatementsBucket", {
      bucketName: `full-budget-app-upload-${stage}-${Stack.of(this).account}`, // Must be globally unique
      versioned: false,
      encryption: BucketEncryption.S3_MANAGED,
      removalPolicy: RemovalPolicy.DESTROY, // for dev only; change for prod
      autoDeleteObjects: true, // empties bucket before deletion so CloudFormation can remove it
      blockPublicAccess: {
        blockPublicAcls: true,
        blockPublicPolicy: true,
        ignorePublicAcls: true,
        restrictPublicBuckets: true,
      },
      // Required for browser-to-S3 pre-signed PUT uploads.
      // Without this, S3 rejects the CORS preflight and XHR fires onerror.
      cors: [
        {
          allowedMethods: [HttpMethods.PUT],
          allowedOrigins: ["*"],
          allowedHeaders: ["*"],
          maxAge: 3000,
        },
      ],
    });

    new cdk.CfnOutput(this, "UploadBucketName", {
      value: this.uploadBucket.bucketName,
      exportName: `UploadBucketName-${stage}`,
    });
  }
}
