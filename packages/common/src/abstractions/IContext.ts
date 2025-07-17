import { IUploadStatementService, IAuthorizationService } from 'packages/common/src/abstractions';
import { YogaInitialContext } from 'graphql-yoga';

export interface IGraphQLContext extends YogaInitialContext {
  userId: string | null;
  dataSources: {
    authorizationService: IAuthorizationService;
    uploadStatementService: IUploadStatementService;
  };
}