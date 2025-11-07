import { randomUUID } from "crypto";
import {
  ILogger,
  IS3Service,
  ISQSService,
  IUploadRequest,
  ITransactionSqsRequest,
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
      const { bankName, bankType, fileName, contentBase64, userId, tenantId } =
        request;
      this.logger.debug(
        `Uploading statement for bank: ${bankName}, bankType: ${bankType}, fileName: ${fileName}, userId: ${userId}`,
      );
      if (
        !bankName ||
        !bankType ||
        !fileName ||
        !contentBase64 ||
        !userId ||
        !tenantId
      ) {
        const errorMessage = new Error(
          "Missing required parameters for uploading statement",
        );
        this.logger.error("Missing required parameters", errorMessage, {
          ...request,
        });
        return false;
      }
      this.logger.debug("All parameters are valid", {
        bankName,
        bankType,
        fileName,
        userId,
        tenantId,
      });
      const buffer = Buffer.from(contentBase64, "base64");
      const fileKey = `${bankName}/${bankType}}/${randomUUID()}-${fileName}`;
      const transactionRequest: ITransactionSqsRequest = {
        bankName,
        bankType,
        fileName,
        fileKey,
        userId,
        tenantId,
      };
      await this.s3Service.putFile(fileKey, buffer);
      await this.sqsService.sendFileMessage(transactionRequest);
      this.logger.debug(`Statement uploaded successfully: ${fileKey}`);
      return true;
    } catch (error) {
      this.logger.error("Error uploading statement", error as Error, request);
      return false;
    }
  }
}
