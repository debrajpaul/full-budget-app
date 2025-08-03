import { LogLevel } from "./ILogger";

export interface IConfig {
  port: string;
  nodeEnv: string;
  logLevel: LogLevel;
  kafkaBrokersHost: string;
  kafkaBrokersPort: string;
  kafkaClientId: string;
  awsAccessKeyId: string;
  awsSecretAccessKey: string;
  awsRegion: string;
  awsS3Bucket: string;
  sqsQueueUrl: string;
  dynamoUserTable: string;
  dynamoTransactionTable: string;
  jwtSecret: string;
}
