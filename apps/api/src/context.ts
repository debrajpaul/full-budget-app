import { UserStore } from "@db";
import { verifyToken } from "@auth";
import { config } from "./environment";
import { WinstonLogger } from "@logger";
import { S3 } from "@aws-sdk/client-s3";
import { IGraphQLContext } from "@common";
import { SQS } from "@aws-sdk/client-sqs";
import { S3Service, SQSService } from "@client";
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient } from "@aws-sdk/lib-dynamodb";
import { UploadStatementService, AuthorizationService } from "@services";

const client = new DynamoDBClient({ region: config.awsRegion });
const dynamoDBDocumentClient = DynamoDBDocumentClient.from(client);
const s3Client = new S3({ region: config.awsRegion });
const sqsClient = new SQS({ region: config.awsRegion });
const logger = WinstonLogger.getInstance(config.logLevel);
const s3Service = new S3Service(logger.child("S3Service"), s3Client);
const sqsService = new SQSService(logger.child("SQSService"), sqsClient);
const userStore = new UserStore(
  logger.child("UserStore"),
  config.dynamoUserTable,
  dynamoDBDocumentClient,
);
const authorizationService = new AuthorizationService(
  logger.child("AuthorizationService"),
  config.jwtSecret,
  config.jwtExpiration,
  userStore,
);
const uploadStatementService = new UploadStatementService(
  logger.child("UploadStatementService"),
  config.awsS3Bucket,
  config.sqsQueueUrl,
  s3Service,
  sqsService,
);

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
        authorizationService: authorizationService,
        uploadStatementService: uploadStatementService,
      },
    };
  } catch (error) {
    logger.warn(`JWT verification failed: ${error}`);
  }
};

export type AppContext = ReturnType<typeof createContext>;
