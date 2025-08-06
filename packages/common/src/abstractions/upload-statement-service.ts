import { EBankName } from "./bank-parser";
export interface IUploadStatementService {
  uploadStatement(
    bank: EBankName,
    fileName: string,
    contentBase64: string,
    userId: string,
  ): Promise<boolean>;
}
