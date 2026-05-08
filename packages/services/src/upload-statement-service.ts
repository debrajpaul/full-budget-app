import { randomUUID } from "crypto";
import {
  ILogger,
  IS3Service,
  ISQSService,
  IUploadRequest,
  ITransactionSqsRequest,
  IStatementUploadResult,
  IUploadStatementService,
} from "@common";

const LARGE_FILE_WARN_BYTES = 8 * 1024 * 1024; // 8 MB decoded

export class UploadStatementService implements IUploadStatementService {
  constructor(
    private readonly logger: ILogger,
    private readonly s3Service: IS3Service,
    private readonly sqsService: ISQSService
  ) {}

  public async uploadStatement(
    request: IUploadRequest
  ): Promise<IStatementUploadResult> {
    const { bankName, bankType, fileName, contentBase64, userId, tenantId } =
      request;
    this.logger.debug(
      `Uploading statement for bank: ${bankName}, bankType: ${bankType}, fileName: ${fileName}, userId: ${userId}`
    );
    if (
      !bankName ||
      !bankType ||
      !fileName ||
      !contentBase64 ||
      !userId ||
      !tenantId
    ) {
      const err = new Error(
        "Missing required parameters for uploading statement"
      );
      this.logger.error("Missing required parameters", err, { ...request });
      throw err;
    }
    this.logger.debug("All parameters are valid", {
      bankName,
      bankType,
      fileName,
      userId,
      tenantId,
    });

    const buffer = Buffer.from(contentBase64, "base64");
    const warnings: string[] = [];

    // GAP-3: warn when the decoded file exceeds 8 MB — base64 encoding inflates
    // by ~33%, so an 8 MB file becomes ~10.7 MB on the wire, close to Apollo's
    // default body limit. Use createUploadUrl for large statements.
    if (buffer.length > LARGE_FILE_WARN_BYTES) {
      warnings.push(
        `File is ${(buffer.length / 1024 / 1024).toFixed(1)} MB after decoding. ` +
          `Use createUploadUrl + notifyUploadComplete for files over 8 MB to avoid GraphQL body-limit errors.`
      );
    }

    const jobId = randomUUID();
    const fileKey = `${tenantId}/${userId}/${bankName}/${bankType}/${jobId}-${fileName}`;
    const transactionRequest: ITransactionSqsRequest = {
      jobId,
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
    return { jobId, accepted: true, warnings };
  }
}
