import { randomUUID } from "crypto";
import {
  ILogger,
  IS3Service,
  ISQSService,
  ETenantType,
  EBankName,
  EBankType,
  ICreateUploadUrlInput,
  IUploadUrlResult,
  IStatementUploadResult,
  IUploadUrlService,
} from "@common";
import { CustomError } from "./custom-error";

const UPLOAD_URL_TTL_SECONDS = 300;
// RFC 4122 UUID — used to guard against path-traversal via user-supplied jobId
const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

interface IJobMeta {
  jobId: string;
  bankName: EBankName;
  bankType: EBankType;
  fileName: string;
  fileKey: string;
  userId: string;
  tenantId: ETenantType;
}

export class UploadUrlService implements IUploadUrlService {
  constructor(
    private readonly logger: ILogger,
    private readonly s3Service: IS3Service,
    private readonly sqsService: ISQSService
  ) {}

  public async createUploadUrl(
    tenantId: ETenantType,
    userId: string,
    input: ICreateUploadUrlInput
  ): Promise<IUploadUrlResult> {
    const { bankName, bankType } = input;
    // Strip path separators and dot-dot sequences to prevent S3 key traversal.
    const fileName = input.fileName
      .replace(/\.\.+/g, "_")
      .replace(/[/\\]/g, "_");
    const jobId = randomUUID();
    const fileKey = `${tenantId}/${userId}/${bankName}/${bankType}/${jobId}-${fileName}`;

    const meta: IJobMeta = {
      jobId,
      bankName,
      bankType,
      fileName,
      fileKey,
      userId,
      tenantId,
    };

    await this.s3Service.putFile(
      `jobs/${jobId}.json`,
      Buffer.from(JSON.stringify(meta)),
      "application/json"
    );

    const uploadUrl = await this.s3Service.getSignedUploadUrl(
      fileKey,
      UPLOAD_URL_TTL_SECONDS
    );

    this.logger.debug("Created upload URL", {
      tenantId,
      userId,
      jobId,
      fileKey,
    });
    return { jobId, uploadUrl, expiresInSeconds: UPLOAD_URL_TTL_SECONDS };
  }

  public async notifyUploadComplete(
    tenantId: ETenantType,
    userId: string,
    jobId: string
  ): Promise<IStatementUploadResult> {
    // Reject any non-UUID value before it reaches the S3 key — prevents path traversal
    // (e.g. jobId = "../../../sensitive-key" would read an arbitrary S3 object).
    if (!UUID_REGEX.test(jobId)) {
      throw new CustomError("Invalid job ID format", "INVALID_JOB_ID");
    }

    let meta: IJobMeta;
    try {
      const buf = await this.s3Service.getFile(`jobs/${jobId}.json`);
      meta = JSON.parse(buf.toString()) as IJobMeta;
    } catch {
      throw new CustomError(
        "Upload job not found or already processed",
        "JOB_NOT_FOUND"
      );
    }

    if (meta.userId !== userId || meta.tenantId !== tenantId) {
      throw new CustomError("Job does not belong to this user", "UNAUTHORIZED");
    }

    await this.sqsService.sendFileMessage({
      jobId: meta.jobId,
      bankName: meta.bankName,
      bankType: meta.bankType,
      fileName: meta.fileName,
      fileKey: meta.fileKey,
      userId: meta.userId,
      tenantId: meta.tenantId,
    });

    this.logger.debug("Enqueued transaction processing job", {
      tenantId,
      userId,
      jobId,
    });
    return { jobId, accepted: true, warnings: [] };
  }
}
