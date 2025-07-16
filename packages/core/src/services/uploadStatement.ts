import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { SQSClient, SendMessageCommand } from '@aws-sdk/client-sqs';
import { randomUUID } from 'crypto';
import { IUploadStatementService } from '../abstractions/IUploadStatementService';

export class UploadStatementService implements IUploadStatementService {

    constructor(
        private readonly s3: S3Client,
        private readonly sqs: SQSClient,
        private readonly bucket: string,
        private readonly queueUrl: string
    ) {}

  public async uploadStatement(bank: string, fileName: string, contentBase64: string): Promise<boolean> {
    if (!bank || !fileName || !contentBase64) {
      throw new Error('Missing required parameters');
    }

    const buffer = Buffer.from(contentBase64, 'base64');
    const key = `${bank}/${randomUUID()}-${fileName}`;

    try {
      await this.s3.send(new PutObjectCommand({
        Bucket: this.bucket,
        Key: key,
        Body: buffer,
        ContentType: 'application/pdf', // Adjust based on actual file type
      }));

      await this.sqs.send(new SendMessageCommand({
        QueueUrl: this.queueUrl,
        MessageBody: JSON.stringify({ bank, fileName, key }),
      }));

      return true;
    } catch (error) {
      console.error('Error uploading statement:', error);
      throw new Error('Failed to upload statement');
    }
  }
}