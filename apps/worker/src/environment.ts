import * as dotenv from "dotenv";
import path from "path";
import { LogLevel } from "@logger";
import { IConfig } from "@common";

console.log(`### path:${path.join(__dirname, "../../../.env")}`);
dotenv.config({ path: path.join(__dirname, "../../../.env") });

const {
  PORT,
  NODE_ENV,
  LOG_LEVEL,
  MONGO_HOST,
  MONGO_PORT,
  MONGO_DB,
  KAFKA_BROKERS_HOST,
  KAFKA_BROKERS_PORT,
  CLIENT_ID,
  AWS_ACCESS_KEY_ID,
  AWS_SECRET_ACCESS_KEY,
  AWS_REGION,
  S3_BUCKET,
  SQS_QUEUE_URL,
  DYNAMO_USER_TABLE,
  DYNAMO_TRANSACTION_TABLE,
  JWT_SECRET,
} = process.env;

export const config: IConfig = {
  port: PORT as string,
  nodeEnv: NODE_ENV as string,
  logLevel: LOG_LEVEL as LogLevel,
  mongoHost: MONGO_HOST as string,
  mongoPort: MONGO_PORT as string,
  mongoDB: MONGO_DB as string,
  kafkaBrokersHost: KAFKA_BROKERS_HOST as string,
  kafkaBrokersPort: KAFKA_BROKERS_PORT as string,
  clientId: CLIENT_ID as string,
  awsAccessKeyId: AWS_ACCESS_KEY_ID as string,
  awsSecretAccessKey: AWS_SECRET_ACCESS_KEY as string,
  awsRegion: AWS_REGION as string,
  awsS3Bucket: S3_BUCKET as string,
  sqsQueueUrl: SQS_QUEUE_URL as string,
  dynamoUserTable: DYNAMO_USER_TABLE as string,
  dynamoTransactionTable: DYNAMO_TRANSACTION_TABLE as string,
  jwtSecret: JWT_SECRET as string,
  jwtExpiration: 30 * 60 * 1000, // Default to 30 minutes if not set
};
