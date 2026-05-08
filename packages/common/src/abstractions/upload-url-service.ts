import { EBankName, EBankType } from "./bank-parser";
import { ETenantType } from "./users";
import { IStatementUploadResult } from "./upload-statement-service";

export interface ICreateUploadUrlInput {
  bankName: EBankName;
  bankType: EBankType;
  fileName: string;
}

export interface IUploadUrlResult {
  jobId: string;
  uploadUrl: string;
  expiresInSeconds: number;
}

export interface IUploadUrlService {
  createUploadUrl(
    tenantId: ETenantType,
    userId: string,
    input: ICreateUploadUrlInput
  ): Promise<IUploadUrlResult>;

  notifyUploadComplete(
    tenantId: ETenantType,
    userId: string,
    jobId: string
  ): Promise<IStatementUploadResult>;
}
