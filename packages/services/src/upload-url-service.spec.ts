import { mock } from "jest-mock-extended";
import {
  ILogger,
  ETenantType,
  IS3Service,
  ISQSService,
  EBankName,
  EBankType,
} from "@common";
import { UploadUrlService } from "./upload-url-service";

const TENANT = ETenantType.personal;
const USER_ID = "user-1";
const SIGNED_URL = "https://s3.example.com/presigned";
const EXPIRES = 300;
// A valid RFC-4122 UUID used as a stable jobId in notifyUploadComplete tests.
const VALID_JOB_ID = "550e8400-e29b-41d4-a716-446655440000";

const makeService = (
  s3: ReturnType<typeof mock<IS3Service>>,
  sqs: ReturnType<typeof mock<ISQSService>>
) => new UploadUrlService(mock<ILogger>(), s3, sqs);

const validInput = {
  bankName: EBankName.hdfc,
  bankType: EBankType.savings,
  fileName: "statement.pdf",
};

describe("UploadUrlService.createUploadUrl", () => {
  it("stores job metadata in S3 and returns a signed URL + jobId", async () => {
    const s3 = mock<IS3Service>();
    const sqs = mock<ISQSService>();
    s3.putFile.mockResolvedValue(undefined);
    s3.getSignedUploadUrl.mockResolvedValue(SIGNED_URL);

    const svc = makeService(s3, sqs);
    const result = await svc.createUploadUrl(TENANT, USER_ID, validInput);

    expect(result.uploadUrl).toBe(SIGNED_URL);
    expect(result.expiresInSeconds).toBe(EXPIRES);
    expect(typeof result.jobId).toBe("string");
    expect(result.jobId).toHaveLength(36); // UUID

    expect(s3.putFile).toHaveBeenCalledWith(
      `jobs/${result.jobId}.json`,
      expect.any(Buffer),
      "application/json"
    );
    expect(s3.getSignedUploadUrl).toHaveBeenCalledWith(
      expect.stringContaining(`${TENANT}/${USER_ID}/`),
      EXPIRES
    );
  });

  it("scopes the S3 file key with tenantId and userId", async () => {
    const s3 = mock<IS3Service>();
    s3.putFile.mockResolvedValue(undefined);
    s3.getSignedUploadUrl.mockResolvedValue(SIGNED_URL);

    const result = await makeService(s3, mock<ISQSService>()).createUploadUrl(
      TENANT,
      USER_ID,
      validInput
    );

    const [fileKey] = s3.getSignedUploadUrl.mock.calls[0];
    expect(fileKey).toMatch(
      new RegExp(
        `^${TENANT}/${USER_ID}/${validInput.bankName}/${validInput.bankType}/${result.jobId}-${validInput.fileName}$`
      )
    );
  });

  it("stores bankName, bankType, userId, tenantId in job metadata", async () => {
    const s3 = mock<IS3Service>();
    s3.putFile.mockResolvedValue(undefined);
    s3.getSignedUploadUrl.mockResolvedValue(SIGNED_URL);

    const result = await makeService(s3, mock<ISQSService>()).createUploadUrl(
      TENANT,
      USER_ID,
      validInput
    );

    const [, metaBuffer] = s3.putFile.mock.calls[0];
    const meta = JSON.parse((metaBuffer as Buffer).toString());
    expect(meta.jobId).toBe(result.jobId);
    expect(meta.bankName).toBe(validInput.bankName);
    expect(meta.bankType).toBe(validInput.bankType);
    expect(meta.userId).toBe(USER_ID);
    expect(meta.tenantId).toBe(TENANT);
  });

  it("strips path separators from fileName before embedding in S3 key", async () => {
    const s3 = mock<IS3Service>();
    s3.putFile.mockResolvedValue(undefined);
    s3.getSignedUploadUrl.mockResolvedValue(SIGNED_URL);

    await makeService(s3, mock<ISQSService>()).createUploadUrl(
      TENANT,
      USER_ID,
      {
        ...validInput,
        fileName: "../../evil/path.pdf",
      }
    );

    const [fileKey] = s3.getSignedUploadUrl.mock.calls[0];
    expect(fileKey).not.toContain("..");
    expect(fileKey).not.toContain("/evil/");
  });
});

describe("UploadUrlService.notifyUploadComplete", () => {
  const makeMetaBuf = (overrides: object = {}) =>
    Buffer.from(
      JSON.stringify({
        jobId: VALID_JOB_ID,
        bankName: EBankName.hdfc,
        bankType: EBankType.savings,
        fileName: "statement.pdf",
        fileKey: `${TENANT}/${USER_ID}/HDFC/SAVINGS/${VALID_JOB_ID}-statement.pdf`,
        userId: USER_ID,
        tenantId: TENANT,
        ...overrides,
      })
    );

  it("enqueues SQS job and returns StatementUploadResult { jobId, accepted: true, warnings: [] }", async () => {
    const s3 = mock<IS3Service>();
    const sqs = mock<ISQSService>();
    s3.getFile.mockResolvedValue(makeMetaBuf());
    sqs.sendFileMessage.mockResolvedValue(undefined);

    const result = await makeService(s3, sqs).notifyUploadComplete(
      TENANT,
      USER_ID,
      VALID_JOB_ID
    );

    expect(result.accepted).toBe(true);
    expect(result.jobId).toBe(VALID_JOB_ID);
    expect(result.warnings).toEqual([]);
    expect(s3.getFile).toHaveBeenCalledWith(`jobs/${VALID_JOB_ID}.json`);
    expect(sqs.sendFileMessage).toHaveBeenCalledWith(
      expect.objectContaining({ jobId: VALID_JOB_ID })
    );
  });

  it("throws INVALID_JOB_ID when jobId is not a valid UUID (path-traversal guard)", async () => {
    const s3 = mock<IS3Service>();

    await expect(
      makeService(s3, mock<ISQSService>()).notifyUploadComplete(
        TENANT,
        USER_ID,
        "../../../sensitive-file"
      )
    ).rejects.toMatchObject({ code: "INVALID_JOB_ID" });

    expect(s3.getFile).not.toHaveBeenCalled();
  });

  it("throws INVALID_JOB_ID for any non-UUID string", async () => {
    await expect(
      makeService(mock<IS3Service>(), mock<ISQSService>()).notifyUploadComplete(
        TENANT,
        USER_ID,
        "not-a-uuid"
      )
    ).rejects.toMatchObject({ code: "INVALID_JOB_ID" });
  });

  it("throws JOB_NOT_FOUND when metadata file does not exist", async () => {
    const s3 = mock<IS3Service>();
    s3.getFile.mockRejectedValue(new Error("NoSuchKey"));

    await expect(
      makeService(s3, mock<ISQSService>()).notifyUploadComplete(
        TENANT,
        USER_ID,
        VALID_JOB_ID
      )
    ).rejects.toMatchObject({ code: "JOB_NOT_FOUND" });
  });

  it("throws UNAUTHORIZED when job belongs to a different user", async () => {
    const s3 = mock<IS3Service>();
    s3.getFile.mockResolvedValue(makeMetaBuf({ userId: "other-user" }));

    await expect(
      makeService(s3, mock<ISQSService>()).notifyUploadComplete(
        TENANT,
        USER_ID,
        VALID_JOB_ID
      )
    ).rejects.toMatchObject({ code: "UNAUTHORIZED" });
  });

  it("throws UNAUTHORIZED when job belongs to a different tenant", async () => {
    const s3 = mock<IS3Service>();
    s3.getFile.mockResolvedValue(makeMetaBuf({ tenantId: ETenantType.client }));

    await expect(
      makeService(s3, mock<ISQSService>()).notifyUploadComplete(
        TENANT,
        USER_ID,
        VALID_JOB_ID
      )
    ).rejects.toMatchObject({ code: "UNAUTHORIZED" });
  });
});
