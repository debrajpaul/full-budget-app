import { IAuthorizationService } from "./IAuthorizationService";
import { IUploadStatementService } from "./IUploadStatementService";
import { ITransactionService } from "./ITransactionService";
import { YogaInitialContext } from "graphql-yoga";

export interface IGraphQLContext extends YogaInitialContext {
  userId: string | null;
  dataSources: {
    authorizationService: IAuthorizationService;
    uploadStatementService: IUploadStatementService;
    transactionService: ITransactionService;
  };
}
