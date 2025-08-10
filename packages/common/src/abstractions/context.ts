import type { Request, Response } from "express";
import type { APIGatewayProxyEventV2, Context as LambdaCtx } from "aws-lambda";
import { IAuthorizationService } from "./authorization-service";
import { IUploadStatementService } from "./upload-statement-service";
import { ITransactionService } from "./transaction-service";
export interface IGraphQLContext {
  request: Request | APIGatewayProxyEventV2; // Optional for Express or Lambda event
  response?: Response; // Optional for Express response
  lambdaContext?: LambdaCtx; // Optional for Lambda context
  userId: string | null;
  tenantId: string | null;
  dataSources: {
    authorizationService: IAuthorizationService;
    uploadStatementService: IUploadStatementService;
    transactionService: ITransactionService;
  };
}
