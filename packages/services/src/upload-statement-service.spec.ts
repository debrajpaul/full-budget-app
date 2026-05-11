import { UploadStatementService } from "./upload-statement-service";
import { mock } from "jest-mock-extended";
import {
  ILogger,
  IS3Service,
  ISQSService,
  IUploadRequest,
  EBankName,
  EBankType,
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
    bankType: EBankType.savings,
    fileName: "statement.pdf",
    contentBase64: Buffer.from("test content").toString("base64"),
    userId: "user1",
    tenantId: ETenantType.default,
  };

  it("returns StatementUploadResult { jobId, accepted: true, warnings: [] } on success", async () => {
    s3.putFile.mockResolvedValue();
    sqs.sendFileMessage.mockResolvedValue();

    const result = await service.uploadStatement(validRequest);

    expect(result.accepted).toBe(true);
    expect(typeof result.jobId).toBe("string");
    expect(result.jobId).toHaveLength(36); // UUID
    expect(result.warnings).toEqual([]);

    expect(s3.putFile).toHaveBeenCalled();
    expect(sqs.sendFileMessage).toHaveBeenCalledWith(
      expect.objectContaining({
        jobId: result.jobId,
        bankName: validRequest.bankName,
        bankType: validRequest.bankType,
        fileName: validRequest.fileName,
        userId: validRequest.userId,
        tenantId: validRequest.tenantId,
      })
    );
  });

  it("includes a size warning when the decoded file exceeds 8 MB (GAP-3)", async () => {
    s3.putFile.mockResolvedValue();
    sqs.sendFileMessage.mockResolvedValue();

    const largeBuffer = Buffer.alloc(9 * 1024 * 1024, "x");
    const oversize: IUploadRequest = {
      ...validRequest,
      contentBase64: largeBuffer.toString("base64"),
    };

    const result = await service.uploadStatement(oversize);

    expect(result.accepted).toBe(true);
    expect(result.warnings).toHaveLength(1);
    expect(result.warnings[0]).toMatch(/8 MB/i);
    expect(result.warnings[0]).toMatch(/createUploadUrl/);
  });

  it("throws when required parameters are missing", async () => {
    await expect(service.uploadStatement({} as any)).rejects.toThrow(
      "Missing required parameters"
    );
    expect(logger.error).toHaveBeenCalledWith(
      "Missing required parameters",
      expect.any(Error),
      {}
    );
  });

  it("propagates S3 errors as thrown exceptions", async () => {
    s3.putFile.mockRejectedValue(new Error("S3 fail"));
    await expect(service.uploadStatement(validRequest)).rejects.toThrow(
      "S3 fail"
    );
  });
});
