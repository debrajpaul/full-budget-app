import { EBankName } from "./bank-parser";
import { ETenantType } from "./users";

export interface IUploadRequest {
  bank: EBankName;
  fileName: string;
  contentBase64: string;
  userId: string;
  tenantId: ETenantType;
}
export interface IUploadStatementService {
  uploadStatement(request: IUploadRequest): Promise<boolean>;
}
