import { verifyToken } from "@auth";
import { config } from "./environment";
import { IGraphQLContext } from "@common";
import { ExpressContextFunctionArgument } from "@as-integrations/express5";
import { setupDependency } from "./setup-dependency";
import { setupServices } from "./setup-services";

const { logger, s3Client, sqsClient, dynamoDBDocumentClient } =
  setupDependency();

const { transactionService, authorizationService, uploadStatementService } =
  setupServices(logger, s3Client, sqsClient, dynamoDBDocumentClient);

export const createContext = async (
  ctx: ExpressContextFunctionArgument,
): Promise<IGraphQLContext> => {
  const authHeader = ctx.req.headers["authorization"] || "";
  const loggerCtx = logger.child("GraphQLContext");
  let userId: string | null = null;
  let tenantId: string | null = null;

  if (!authHeader?.startsWith("Bearer ")) {
    loggerCtx.warn(`Malformed Authorization header: ${authHeader}`);
  }
  const token = authHeader.replace("Bearer ", "") ?? null;
  try {
    const payload = verifyToken(token, config.jwtSecret) as {
      userId: string;
      tenantId: string;
    };
    userId = payload.userId;
    tenantId = payload.tenantId;
  } catch (error) {
    loggerCtx.warn(`JWT verification failed: ${error}`);
  }

  if (!userId) {
    loggerCtx.error("Missing userId from JWT");
    throw new Error("Unauthorized");
  }

  if (!tenantId) {
    loggerCtx.error("Missing tenantId from JWT");
    throw new Error("Unauthorized");
  }

  return {
    ...ctx,
    userId,
    tenantId,
    dataSources: {
      authorizationService: authorizationService,
      uploadStatementService: uploadStatementService,
      transactionService: transactionService,
    },
  };
};
