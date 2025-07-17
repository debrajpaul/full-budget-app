import { IS3Service,ISQSService } from '@common/abstractions';
import { parseTransactions } from './parseTransactions';
import { config } from './environment';
import { saveTransaction } from '@db/models';
import { ILogger } from '@logger/index';
import { S3Service , SQSService} from '@client/index';
import { WinstonLogger } from "@logger/winston-logger";
import { S3 } from '@aws-sdk/client-s3';
import { SQS } from '@aws-sdk/client-sqs';

class WorkerApp {
  private readonly logger: ILogger;
  private readonly s3Service: IS3Service;
  private readonly sqsService: ISQSService;
  private readonly queueUrl: string;
  private readonly bucket: string;

  constructor(logger: ILogger, s3Service: IS3Service, sqsService: ISQSService, bucket: string, queueUrl: string) {
    this.logger = logger;
    this.s3Service = s3Service;
    this.sqsService = sqsService;
    this.bucket = bucket;
    this.queueUrl = queueUrl;
  }

  async processMessages() {
    this.logger.info('WorkerApp started processing messages');
    this.logger.debug('Queue URL', { queueUrl: this.queueUrl });
    this.logger.debug('S3 Bucket', { bucket: this.bucket });
    this.logger.debug('SQS Service initialized', { sqsService: this.sqsService });
    while (true) {
      this.logger.info('Waiting for messages from SQS...');
      try {
        this.logger.debug('Attempting to receive message from SQS', { queueUrl: this.queueUrl });
        const message = await this.sqsService.receiveFileMessage(this.queueUrl);
        if (!message) {
          await new Promise(res => setTimeout(res, 2000));
          continue;
        }
        if (!message.fileKey || !message.bank || !message.userId) {
          console.error('Invalid message body:', message);
          continue;
        }
       this.logger.info(`Processing fileKey: ${message.fileKey}, bank: ${message.bank}, userId: ${message.userId}`);
        const fileBuffer = await this.s3Service.getFile(this.bucket, message.fileKey);
       this.logger.info(`fileBuffer length: ${fileBuffer.length}`);
        const transactions = await parseTransactions(fileBuffer, message.bank, message.userId);
       this.logger.info(`Parsed ${transactions.length} transactions.`);
        for (const tx of transactions) {
          await saveTransaction(tx, config.dynamoTransactionTable);
        }
        this.logger.info(`Processed ${transactions.length} transactions.`);
      } catch (err) {
        this.logger.error('Error processing message', err as Error);
        await new Promise(res => setTimeout(res, 2000));
      }
    }
  }
}

const logger = WinstonLogger.getInstance(config.logLevel);
const s3Client = new S3({
  region: config.awsRegion,
});
const sqsClient = new SQS({
  region: config.awsRegion,
});
const s3Service = new S3Service(
  logger.child('S3Service'),
   s3Client
);
const sqsService = new SQSService(
  logger.child('SQSService'),
  sqsClient
);

const app = new WorkerApp(logger.child('WorkerApp'), s3Service, sqsService, config.awsS3Bucket, config.sqsQueueUrl);
app.processMessages();
