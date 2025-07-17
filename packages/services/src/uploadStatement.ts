import { randomUUID } from 'crypto';
import { ILogger } from '@logger/index';
import { IS3Service, ISQSService, IUploadStatementService } from '@common/abstractions';

export class UploadStatementService implements IUploadStatementService {

    constructor(
        private readonly logger: ILogger,
        private readonly bucket: string,
        private readonly queueUrl: string,
        private readonly s3Service: IS3Service,
        private readonly sqsService: ISQSService
    ) {}

  public async uploadStatement(bank: string, fileName: string, contentBase64: string, userId: string): Promise<boolean> {
    try {
      this.logger.info(`Uploading statement for bank: ${bank}, fileName: ${fileName}, userId: ${userId}`);
      this.logger.debug('Parameters', { bank, fileName, userId });
      if (!bank || !fileName || !contentBase64 || !userId) {
        const errorMessage = new Error('Missing required parameters for uploading statement');
        this.logger.error('Missing required parameters', errorMessage, { bank, fileName, userId });
        throw errorMessage;
      }
      this.logger.debug('All parameters are valid', { bank, fileName, userId });
      const buffer = Buffer.from(contentBase64, 'base64');
      const fileKey = `${bank}/${randomUUID()}-${fileName}`;

      await this.s3Service.putFile(this.bucket, fileKey, buffer);
      await this.sqsService.sendFileMessage(this.queueUrl, { bank, fileName, fileKey, userId });
      this.logger.info(`Statement uploaded successfully: ${fileKey}`, { bank, fileName, userId });
      return true;
    } catch (error) {
      this.logger.error('Error uploading statement', error as Error, { bank, fileName, userId });
      throw new Error('Failed to upload statement');
    }
  }
}