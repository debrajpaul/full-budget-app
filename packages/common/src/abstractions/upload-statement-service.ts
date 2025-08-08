import { EBankName } from "./bank-parser";

export interface IUploadRequest {
  bank: EBankName;
  fileName: string;
  contentBase64: string;
  userId: string;
  tenantId: string;
}
export interface IUploadStatementService {
  uploadStatement(request: IUploadRequest): Promise<boolean>;
}
