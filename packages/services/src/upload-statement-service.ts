import { randomUUID } from "crypto";
import {
  ILogger,
  IS3Service,
  ISQSService,
  IUploadRequest,
  ITransactionRequest,
  IUploadStatementService,
} from "@common";

export class UploadStatementService implements IUploadStatementService {
  constructor(
    private readonly logger: ILogger,
    private readonly s3Service: IS3Service,
    private readonly sqsService: ISQSService,
  ) {}

  public async uploadStatement(request: IUploadRequest): Promise<boolean> {
    try {
      const { bankName, fileName, contentBase64, userId, tenantId } = request;
      this.logger.info(
        `Uploading statement for bank: ${bankName}, fileName: ${fileName}, userId: ${userId}`,
      );
      this.logger.debug("Parameters", { bankName, fileName, userId });
      if (!bankName || !fileName || !contentBase64 || !userId || !tenantId) {
        const errorMessage = new Error(
          "Missing required parameters for uploading statement",
        );
        this.logger.error("Missing required parameters", errorMessage, {
          bankName,
          fileName,
          userId,
          tenantId,
        });
        throw errorMessage;
      }
      this.logger.debug("All parameters are valid", {
        bankName,
        fileName,
        userId,
        tenantId,
      });
      const buffer = Buffer.from(contentBase64, "base64");
      const fileKey = `${bankName}/${randomUUID()}-${fileName}`;
      const transactionRequest: ITransactionRequest = {
        bankName,
        fileName,
        fileKey,
        userId,
        tenantId,
      };
      await this.s3Service.putFile(fileKey, buffer);
      await this.sqsService.sendFileMessage(transactionRequest);
      this.logger.info(`Statement uploaded successfully: ${fileKey}`, {
        bankName,
        fileName,
        userId,
      });
      return true;
    } catch (error) {
      this.logger.error("Error uploading statement", error as Error, request);
      throw new Error("Failed to upload statement");
    }
  }
}
