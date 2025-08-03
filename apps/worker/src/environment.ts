import path from "path";
import * as dotenv from "dotenv";
import { IConfig, LogLevel } from "@common";

console.log(`### path:${path.join(__dirname, "../../../.env")}`);
dotenv.config({ path: path.join(__dirname, "../../../.env") });

const {
  PORT,
  NODE_ENV,
  LOG_LEVEL,
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
  kafkaBrokersHost: KAFKA_BROKERS_HOST as string,
  kafkaBrokersPort: KAFKA_BROKERS_PORT as string,
  kafkaClientId: CLIENT_ID as string,
  awsAccessKeyId: AWS_ACCESS_KEY_ID as string,
  awsSecretAccessKey: AWS_SECRET_ACCESS_KEY as string,
  awsRegion: AWS_REGION as string,
  awsS3Bucket: S3_BUCKET as string,
  sqsQueueUrl: SQS_QUEUE_URL as string,
  dynamoUserTable: DYNAMO_USER_TABLE as string,
  dynamoTransactionTable: DYNAMO_TRANSACTION_TABLE as string,
  jwtSecret: JWT_SECRET as string,
};
