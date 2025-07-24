import { verifyToken } from "@auth";
import { IGraphQLContext } from "@common";
import { S3 } from "@aws-sdk/client-s3";
import { SQS } from "@aws-sdk/client-sqs";
import { config } from "./environment";
import { S3Service, SQSService } from "@client";
import { WinstonLogger } from "@logger";
import { UploadStatementService, AuthorizationService } from "@services";

const s3Client = new S3({ region: config.awsRegion });
const sqsClient = new SQS({ region: config.awsRegion });
const logger = WinstonLogger.getInstance(config.logLevel);
const s3Service = new S3Service(logger.child("S3Service"), s3Client);
const sqsService = new SQSService(logger.child("SQSService"), sqsClient);

const BUCKET = config.awsS3Bucket;
const QUEUE_URL = config.sqsQueueUrl;

export const createContext = async (ctx: IGraphQLContext) => {
  try {
    const authHeader = ctx.request.headers.get("authorization") || "";
    if (!authHeader) {
      logger.warn("No Authorization header provided");
    }
    if (!authHeader.startsWith("Bearer ")) {
      logger.warn(`Malformed Authorization header: ${authHeader}`);
    }
    const token = authHeader.replace("Bearer ", "") ?? null;
    let userId: string | null = null;

    if (token) {
      const payload = verifyToken(token, config.jwtSecret) as {
        userId: string;
      };
      userId = payload.userId;
    }

    return {
      ...ctx,
      userId,
      dataSources: {
        authorizationService: new AuthorizationService(
          logger.child("AuthorizationService"),
          config.jwtSecret,
          config.jwtExpiration,
          config.dynamoUserTable,
        ),
        uploadStatementService: new UploadStatementService(
          logger.child("UploadStatementService"),
          BUCKET,
          QUEUE_URL,
          s3Service,
          sqsService,
        ),
      },
    };
  } catch (error) {
    logger.warn(`JWT verification failed: ${error}`);
  }
};

export type AppContext = ReturnType<typeof createContext>;
