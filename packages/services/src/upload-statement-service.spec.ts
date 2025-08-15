import { UploadStatementService } from "./upload-statement-service";
import { mock } from "jest-mock-extended";
import {
  ILogger,
  IS3Service,
  ISQSService,
  IUploadRequest,
  EBankName,
  ETenantType,
} from "@common";

describe("UploadStatementService", () => {
  let logger: ReturnType<typeof mock<ILogger>>;
  let s3: ReturnType<typeof mock<IS3Service>>;
  let sqs: ReturnType<typeof mock<ISQSService>>;
  let service: UploadStatementService;

  beforeEach(() => {
    logger = mock<ILogger>();
    s3 = mock<IS3Service>();
    sqs = mock<ISQSService>();
    service = new UploadStatementService(logger, s3, sqs);
  });

  const validRequest: IUploadRequest = {
    bankName: EBankName.hdfc,
    fileName: "statement.pdf",
    contentBase64: Buffer.from("test").toString("base64"),
    userId: "user1",
    tenantId: ETenantType.default,
  };

  it("should upload statement and send SQS message", async () => {
    s3.putFile.mockResolvedValue();
    sqs.sendFileMessage.mockResolvedValue();
    const result = await service.uploadStatement(validRequest);
    expect(s3.putFile).toHaveBeenCalled();
    expect(sqs.sendFileMessage).toHaveBeenCalledWith(
      expect.objectContaining({
        bankName: validRequest.bankName,
        fileName: validRequest.fileName,
        userId: validRequest.userId,
        tenantId: validRequest.tenantId,
      }),
    );
    expect(logger.info).toHaveBeenCalledWith(
      expect.stringContaining("Statement uploaded successfully"),
      expect.objectContaining({
        bankName: validRequest.bankName,
        fileName: validRequest.fileName,
        userId: validRequest.userId,
      }),
    );
    expect(result).toBe(true);
  });

  it("should throw and log error if required params are missing", async () => {
    await expect(service.uploadStatement({} as any)).rejects.toThrow(
      "Failed to upload statement",
    );
    expect(logger.error).toHaveBeenCalledWith(
      "Missing required parameters",
      expect.any(Error),
      expect.objectContaining({
        bankName: undefined,
        fileName: undefined,
        userId: undefined,
        tenantId: undefined,
      }),
    );
  });

  it("should throw and log error if s3 or sqs fails", async () => {
    s3.putFile.mockRejectedValue(new Error("fail"));
    await expect(service.uploadStatement(validRequest)).rejects.toThrow(
      "Failed to upload statement",
    );
    expect(logger.error).toHaveBeenCalledWith(
      "Error uploading statement",
      expect.any(Error),
      validRequest,
    );
  });
});
