import {} from "@logger";
import { IS3Service, ILogger } from "@common";
import {
  S3,
  S3ClientConfig,
  GetObjectCommand,
  PutObjectCommand,
} from "@aws-sdk/client-s3";

export type { S3ClientConfig };

export class S3Service implements IS3Service {
  constructor(
    private readonly logger: ILogger,
    private readonly s3Client: S3,
  ) {}

  /**
   * Downloads a file from S3 and returns its buffer.
   */
  async getFile(bucket: string, key: string): Promise<Buffer> {
    this.logger.info("###GettingS3");
    this.logger.debug("###GettingS3", { bucket, key });
    const res = await this.s3Client.send(
      new GetObjectCommand({ Bucket: bucket, Key: key }),
    );
    if (!res.Body) throw new Error("No file body returned from S3");
    const chunks: Buffer[] = [];
    for await (const chunk of res.Body as any) {
      chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
    }
    return Buffer.concat(chunks);
  }

  /**
   * Uploads a file buffer to S3.
   */
  async putFile(
    bucket: string,
    key: string,
    body: Buffer | Uint8Array | string,
  ): Promise<void> {
    this.logger.info("#PuttingS3");
    this.logger.debug("PuttingS3", { bucket, key });
    await this.s3Client.send(
      new PutObjectCommand({
        Bucket: bucket,
        Key: key,
        Body: body,
        ContentType: "application/pdf", // Adjust based on actual file type
      }),
    );
  }
}
