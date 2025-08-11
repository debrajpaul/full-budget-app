import { verifyToken } from "@auth";
import { config } from "./environment";
import { IGraphQLContext } from "@common";
import { Request, Response } from "express";
import { ExpressContextFunctionArgument } from "@as-integrations/express5";
import {
  LambdaContextFunctionArgument,
  handlers,
} from "@as-integrations/aws-lambda";
import { APIGatewayProxyEventV2, Context as LambdaCtx } from "aws-lambda";
import { setupDependency } from "./setup-dependency";
import { setupServices } from "./setup-services";

type IncomingRequest =
  | ExpressContextFunctionArgument
  | LambdaContextFunctionArgument<
      handlers.RequestHandler<APIGatewayProxyEventV2, any>
    >;

const { logger, s3Client, sqsClient, dynamoDBDocumentClient } =
  setupDependency();

const { transactionService, authorizationService, uploadStatementService } =
  setupServices(logger, s3Client, sqsClient, dynamoDBDocumentClient);

export const createContext = async (
  ctx: IncomingRequest,
): Promise<IGraphQLContext> => {
  const loggerCtx = logger.child("GraphQLContext");
  // Detect Express vs Lambda & get auth header
  let request: Request | APIGatewayProxyEventV2;
  let response: Response | undefined;
  let lambdaContext: LambdaCtx | undefined;
  let authHeader: string | undefined = undefined;
  let tenantId: string | null = null;
  let userId: string | null = null;

  if (isExpressContext(ctx)) {
    // Express context
    authHeader = ctx.req.headers["authorization"] as string | undefined;
    request = ctx.req;
    response = ctx.res;
  } else {
    // Lambda context
    authHeader = ctx.event.headers?.authorization;
    request = ctx.event;
    lambdaContext = ctx.context;
  }

  if (!authHeader?.startsWith("Bearer ")) {
    loggerCtx.warn(`Malformed Authorization header: ${authHeader}`);
  }
  const token = authHeader?.replace("Bearer ", "") ?? null;
  try {
    const payload = verifyToken(token || "", config.jwtSecret) as {
      userId: string;
      tenantId: string;
    };
    userId = payload.userId;
    tenantId = payload.tenantId;
  } catch (error) {
    loggerCtx.warn(`JWT verification failed: ${error}`);
  }

  if (!userId || !tenantId) {
    loggerCtx.error("Missing userId or tenantId from JWT");
    throw new Error("Unauthorized");
  }
  return {
    request,
    response,
    lambdaContext,
    userId,
    tenantId,
    dataSources: {
      authorizationService: authorizationService,
      uploadStatementService: uploadStatementService,
      transactionService: transactionService,
    },
  };
};

function isExpressContext(
  ctx: IncomingRequest,
): ctx is ExpressContextFunctionArgument {
  return "req" in ctx;
}
