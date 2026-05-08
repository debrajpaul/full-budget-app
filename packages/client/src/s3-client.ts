import {} from "@logger";
import { IS3Service, ILogger } from "@common";
import {
  S3,
  S3ClientConfig,
  GetObjectCommand,
  PutObjectCommand,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

export type { S3ClientConfig };

export class S3Service implements IS3Service {
  constructor(
    private readonly logger: ILogger,
    private readonly bucketName: string,
    private readonly s3Client: S3
  ) {}

  /**
   * Downloads a file from S3 and returns its buffer.
   */
  async getFile(key: string): Promise<Buffer> {
    this.logger.debug("###GettingS3", { key });
    const res = await this.s3Client.send(
      new GetObjectCommand({ Bucket: this.bucketName, Key: key })
    );
    if (res.$metadata.httpStatusCode !== 200)
      throw new Error(
        `Failed to get file from S3: ${res.$metadata.httpStatusCode}`
      );
    if (!res.Body) throw new Error(`No file body returned from S3: ${key}`);
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
    key: string,
    body: Buffer | Uint8Array | string,
    contentType = "application/pdf"
  ): Promise<void> {
    this.logger.info("#PuttingS3");
    this.logger.debug("PuttingS3", { key });
    await this.s3Client.send(
      new PutObjectCommand({
        Bucket: this.bucketName,
        Key: key,
        Body: body,
        ContentType: contentType,
      })
    );
  }

  async getSignedUploadUrl(key: string, ttlSeconds: number): Promise<string> {
    this.logger.debug("GeneratingSignedUploadUrl", { key, ttlSeconds });
    return getSignedUrl(
      this.s3Client,
      new PutObjectCommand({ Bucket: this.bucketName, Key: key }),
      { expiresIn: ttlSeconds }
    );
  }
}
