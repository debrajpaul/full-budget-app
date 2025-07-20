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

  async process(table: string, queueUrl: string, bucket: string) {
    this.logger.info("ProcessService started processing messages");

    this.logger.debug("SQS Service initialized", {
      sqsService: this.sqsService,
    });
    while (true) {
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
          await new Promise((res) => setTimeout(res, 2000));
          continue;
        }
        if (!message.fileKey || !message.bank || !message.userId) {
          console.error("Invalid message body:", message);
          continue;
        }
        this.logger.info(
          `Processing fileKey: ${message.fileKey}, bank: ${message.bank}, userId: ${message.userId}`,
        );
        const fileBuffer = await this.s3Service.getFile(
          bucket,
          message.fileKey,
        );
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
      } catch (err) {
        this.logger.error("Error processing message", err as Error);
        await new Promise((res) => setTimeout(res, 2000));
      }
    }
  }

  private async parseTransactions(
    buffer: Buffer,
    bank: string,
    userId: string,
  ) {
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
