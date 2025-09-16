import { LogLevel } from "./logger";

export interface IConfig {
  port: string;
  nodeEnv: string;
  logLevel: LogLevel;
  awsAccessKeyId: string;
  awsSecretAccessKey: string;
  awsRegion: string;
  awsS3Bucket: string;
  sqsQueueUrl: string;
  dynamoUserTable: string;
  dynamoTransactionTable: string;
  dynamoCategoryRulesTable: string;
  dynamoRecurringTable: string;
  dynamoBudgetTable: string;
  jwtSecret: string;
  aiTaggingEnabled: boolean;
  bedrockModelId?: string;
}
