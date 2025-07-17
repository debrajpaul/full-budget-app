import { verifyToken } from '@auth';
import { IGraphQLContext } from '@core/abstractions';
import { S3Client } from '@aws-sdk/client-s3';
import { SQSClient } from '@aws-sdk/client-sqs';
import { config } from './environment';
import { UploadStatementService, AuthorizationService } from '@core/services';

const s3 = new S3Client({ region: config.awsRegion });
const sqs = new SQSClient({ region: config.awsRegion });

const BUCKET = config.awsS3Bucket;
const QUEUE_URL = config.sqsQueueUrl;

export const createContext = async ( ctx : IGraphQLContext) => {
   const authHeader = ctx.request.headers.get('authorization') || '';
  const token = authHeader.replace('Bearer ', '') ?? null;
  let userId : string | null = null;

  if (token) {
    try {
      const payload = verifyToken(token,config.jwtSecret);
      userId = payload.userId;
    } catch {
      console.warn('Invalid or expired token');
    }
  }

  return { 
    ...ctx, 
    userId,
    dataSources: {
      authorizationService: new AuthorizationService(config.jwtSecret, config.jwtExpiration),
      uploadStatementService: new UploadStatementService(s3, sqs, BUCKET, QUEUE_URL),
    }
  };
}

export type AppContext = ReturnType<typeof createContext>;