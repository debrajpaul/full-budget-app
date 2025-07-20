export interface IUploadStatementService {
  uploadStatement(
    bank: string,
    fileName: string,
    contentBase64: string,
    userId: string,
  ): Promise<boolean>;
}
