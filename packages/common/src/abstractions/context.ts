import { Request, Response } from "express";
import { IAuthorizationService } from "./authorization-service";
import { IUploadStatementService } from "./upload-statement-service";
import { ITransactionService } from "./transaction-service";
export interface IGraphQLContext {
  req: Request;
  res: Response;
  userId: string | null;
  tenantId: string | null;
  dataSources: {
    authorizationService: IAuthorizationService;
    uploadStatementService: IUploadStatementService;
    transactionService: ITransactionService;
  };
}
