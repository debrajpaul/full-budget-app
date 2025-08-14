import { Request, Response } from "express";
import { ETenantType } from "./users";
import { ILogger } from "./logger";
import {
  ITransactionService,
  ITransactionCategoryService,
} from "./transactions";
import { IUploadStatementService } from "./upload-statement-service";
import { IAuthorizationService } from "./users/authorization-service";
import { APIGatewayProxyEvent, Context as LambdaCtx } from "aws-lambda";
export interface IGraphQLContext {
  logger: ILogger;
  request: Request | APIGatewayProxyEvent; // Optional for Express or Lambda event
  response?: Response; // Optional for Express response
  lambdaContext?: LambdaCtx; // Optional for Lambda context
  userId: string | null;
  tenantId: ETenantType | null;
  email: string | null;
  dataSources: {
    authorizationService: IAuthorizationService;
    uploadStatementService: IUploadStatementService;
    transactionService: ITransactionService;
    transactionCategoryService: ITransactionCategoryService;
  };
}
