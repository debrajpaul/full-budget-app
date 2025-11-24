import { LogLevel } from "./logger";

export interface IConfig {
  port: string;
  nodeEnv: string;
  logLevel: LogLevel;
  useLocalstack: boolean;
  localstackHost: string;
  localstackEdgePort: string;
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
  /**
   * Optional minimum confidence required to accept AI (Bedrock) classifications
   * for auto-tagging. When undefined, all AI classifications are accepted.
   */
  aiConfidenceThreshold?: number;
}
