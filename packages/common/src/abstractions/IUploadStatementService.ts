import { EBankName } from "./IBankParser";
export interface IUploadStatementService {
  uploadStatement(
    bank: EBankName,
    fileName: string,
    contentBase64: string,
    userId: string,
  ): Promise<boolean>;
}
