import { IS3Service, ISQSService, IProcessService } from "@common";
import { HdfcBankParser, SbiBankParser } from "@parser";
import { saveTransaction } from "@db";
import { ILogger } from "@logger";

export class ProcessService implements IProcessService {
  private readonly logger: ILogger;
  private readonly s3Service: IS3Service;
  private readonly sqsService: ISQSService;

  constructor(logger: ILogger, s3Service: IS3Service, sqsService: ISQSService) {
    this.logger = logger;
    this.s3Service = s3Service;
    this.sqsService = sqsService;
  }

  async processes(event: any): Promise<boolean[]> {
    this.logger.info("ProcessService started processing messages");
    this.logger.debug("event", { event });
    const results: boolean[] = [];
    for (const record of event.Records) {
      const body = JSON.parse(record.body);
      this.logger.debug("Received job:", body);
      // Process the job...
      const table = body.table;
      const queueUrl = body.queueUrl;
      const bucket = body.bucket;
      let flag: boolean = await this.process(table, queueUrl, bucket);
      this.logger.debug(`Flag ${flag}`);
      results.push(flag);
    }
    return results;
  }

  async process(
    table: string,
    queueUrl: string,
    bucket: string,
  ): Promise<boolean> {
    this.logger.info("ProcessService started processing messages");

    this.logger.debug("SQS Service initialized", {
      sqsService: this.sqsService,
    });
    this.logger.info("Waiting for messages from SQS...");
    try {
      this.logger.info("ProcessService started processing messages");

      this.logger.debug("SQS Service initialized", {
        sqsService: this.sqsService,
      });
      this.logger.debug("Attempting to receive message from SQS", {
        queueUrl: queueUrl,
      });
      const message = await this.sqsService.receiveFileMessage(queueUrl);
      if (!message) {
        this.logger.info("No messages received from SQS");
        return false;
      }
      if (!message.fileKey || !message.bank || !message.userId) {
        this.logger.error("Invalid message body:", message);
        return false;
      }
      this.logger.info(
        `Processing fileKey: ${message.fileKey}, bank: ${message.bank}, userId: ${message.userId}`,
      );
      const fileBuffer = await this.s3Service.getFile(bucket, message.fileKey);
      this.logger.info(`fileBuffer length: ${fileBuffer.length}`);
      const transactions = await this.parseTransactions(
        fileBuffer,
        message.bank,
        message.userId,
      );
      this.logger.info(`Parsed ${transactions.length} transactions.`);
      for (const tx of transactions) {
        await saveTransaction(tx, table);
      }
      this.logger.info(`Processed ${transactions.length} transactions.`);
      return true;
    } catch (err) {
      this.logger.error("Error processing message", err as Error);
      return false;
    }
  }

  private async parseTransactions(
    buffer: Buffer,
    bank: string,
    userId: string,
  ): Promise<any[]> {
    switch (bank) {
      case "sbi": {
        const parser = new SbiBankParser();
        return parser.parse(buffer, userId);
      }
      case "hdfc": {
        const parser = new HdfcBankParser();
        return parser.parse(buffer, userId);
      }
      default:
        console.warn(`No parser implemented for bank: ${bank}`);
        return [];
    }
  }
}
