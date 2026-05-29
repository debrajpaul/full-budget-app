import * as cdk from "aws-cdk-lib";
import { Stack, StackProps, RemovalPolicy } from "aws-cdk-lib";
import { Bucket, BucketEncryption, HttpMethods } from "aws-cdk-lib/aws-s3";
import { Construct } from "constructs";

export class StorageStack extends Stack {
  public readonly uploadBucket: Bucket;

  constructor(scope: Construct, id: string, props?: StackProps) {
    super(scope, id, props);

    this.uploadBucket = new Bucket(this, "UploadStatementsBucket", {
      bucketName: "full-budget-app-upload-bucket", // Must be globally unique
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
      exportName: "UploadBucketName",
    });
  }
}
