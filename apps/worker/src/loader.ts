import { ITransactionService, ILogger } from "@common";
export class WorkLoader {
  private readonly logger: ILogger;
  private readonly transactionService: ITransactionService;

  constructor(logger: ILogger, transactionService: ITransactionService) {
    this.logger = logger;
    this.transactionService = transactionService;
  }

  async processMessages(queueUrl: string, bucket: string) {
    this.logger.info("WorkLoader started processing messages");
    this.logger.debug("###Queue URL", { queueUrl });
    this.logger.debug("###S3 Bucket", { bucket });
    this.logger.info("Waiting for messages from SQS...");
    try {
      while (true) {
        let flag: boolean = await this.transactionService.process(
          queueUrl,
          bucket,
        );
        this.logger.info("Waiting for messages from SQS...");
        if (!flag) {
          await new Promise((res) => setTimeout(res, 2000));
          continue;
        }
      }
    } catch (err) {
      this.logger.error("Error processing message", err as Error);
      await new Promise((res) => setTimeout(res, 2000));
    }
  }
}
