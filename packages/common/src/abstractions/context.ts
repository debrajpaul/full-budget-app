import { Request, Response } from "express";
import { ITransactionService } from "./transactions";
import { IUploadStatementService } from "./upload-statement-service";
import { IAuthorizationService } from "./users/authorization-service";
import { APIGatewayProxyEvent, Context as LambdaCtx } from "aws-lambda";
export interface IGraphQLContext {
  request: Request | APIGatewayProxyEvent; // Optional for Express or Lambda event
  response?: Response; // Optional for Express response
  lambdaContext?: LambdaCtx; // Optional for Lambda context
  userId: string | null;
  tenantId: string | null;
  email: string | null;
  dataSources: {
    authorizationService: IAuthorizationService;
    uploadStatementService: IUploadStatementService;
    transactionService: ITransactionService;
  };
}
