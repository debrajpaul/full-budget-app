export interface IConfig {
  port: string;
  nodeEnv: string;
  logLevel: string;
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
  jwtSecret: string;
  jwtExpiration: number;
}
