import { IAuthorizationService } from "./IAuthorizationService";
import { IUploadStatementService } from "./IUploadStatementService";
import { YogaInitialContext } from "graphql-yoga";

export interface IGraphQLContext extends YogaInitialContext {
  userId: string | null;
  dataSources: {
    authorizationService: IAuthorizationService;
    uploadStatementService: IUploadStatementService;
  };
}
