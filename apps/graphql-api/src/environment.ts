import path from "path";
import * as dotenv from "dotenv";
import { IConfig, LogLevel } from "@common";

console.log(`### path:${path.join(__dirname, "../../../.env")}`);
dotenv.config({ path: path.join(__dirname, "../../../.env") });

const {
  PORT,
  NODE_ENV,
  LOG_LEVEL,
  USE_LOCALSTACK,
  LOCALSTACK_HOST,
  LOCALSTACK_EDGE_PORT,
  AWS_ACCESS_KEY_ID,
  AWS_SECRET_ACCESS_KEY,
  AWS_REGION,
  AWS_S3_BUCKET,
  SQS_QUEUE_URL,
  DYNAMO_USER_TABLE,
  DYNAMO_TRANSACTION_TABLE,
  DYNAMO_CATEGORY_RULES_TABLE,
  DYNAMO_RECURRING_TABLE,
  DYNAMO_BUDGET_TABLE,
  JWT_SECRET,
  AI_TAGGING_ENABLED,
  BEDROCK_MODEL_ID,
  AI_CONFIDENCE_THRESHOLD,
} = process.env;

export const config: IConfig = {
  port: PORT as string,
  nodeEnv: NODE_ENV as string,
  logLevel: LOG_LEVEL as LogLevel,
  useLocalstack: USE_LOCALSTACK === "true",
  localstackHost: LOCALSTACK_HOST as string,
  localstackEdgePort: LOCALSTACK_EDGE_PORT as string,
  awsAccessKeyId: AWS_ACCESS_KEY_ID as string,
  awsSecretAccessKey: AWS_SECRET_ACCESS_KEY as string,
  awsRegion: AWS_REGION as string,
  awsS3Bucket: AWS_S3_BUCKET as string,
  sqsQueueUrl: SQS_QUEUE_URL as string,
  dynamoUserTable: DYNAMO_USER_TABLE as string,
  dynamoTransactionTable: DYNAMO_TRANSACTION_TABLE as string,
  dynamoCategoryRulesTable: DYNAMO_CATEGORY_RULES_TABLE as string,
  dynamoRecurringTable: DYNAMO_RECURRING_TABLE as string,
  dynamoBudgetTable: DYNAMO_BUDGET_TABLE as string,
  jwtSecret: JWT_SECRET as string,
  aiTaggingEnabled: AI_TAGGING_ENABLED === "true",
  bedrockModelId: BEDROCK_MODEL_ID as string | undefined,
  aiConfidenceThreshold:
    AI_CONFIDENCE_THRESHOLD !== undefined && AI_CONFIDENCE_THRESHOLD !== ""
      ? Number(AI_CONFIDENCE_THRESHOLD)
      : undefined,
};
