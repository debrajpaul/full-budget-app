import { Request, Response } from "express";
import { IAuthorizationService } from "./IAuthorizationService";
import { IUploadStatementService } from "./IUploadStatementService";
import { ITransactionService } from "./ITransactionService";
export interface IGraphQLContext {
  req: Request;
  res: Response;
  userId: string | null;
  dataSources: {
    authorizationService: IAuthorizationService;
    uploadStatementService: IUploadStatementService;
    transactionService: ITransactionService;
  };
}
