import { LogLevel } from "./ILogger";

export interface IConfig {
  port: string;
  nodeEnv: string;
  logLevel: LogLevel;
  mongoHost: string;
  mongoPort: string;
  mongoDB: string;
  kafkaBrokersHost: string;
  kafkaBrokersPort: string;
  clientId: string;
  awsAccessKeyId: string;
  awsSecretAccessKey: string;
  awsRegion: string;
  awsS3Bucket: string;
  sqsQueueUrl: string;
  dynamoUserTable: string;
  dynamoTransactionTable: string;
  jwtSecret: string;
  jwtExpiration: number;
}
