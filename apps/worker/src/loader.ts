import { IProcessService } from "@common";
import { ILogger } from "@logger";

export class WorkLoader {
  private readonly logger: ILogger;
  private readonly processService: IProcessService;

  constructor(logger: ILogger, processService: IProcessService) {
    this.logger = logger;
    this.processService = processService;
  }

  async processMessages(table: string, queueUrl: string, bucket: string) {
    this.logger.info("WorkLoader started processing messages");
    this.logger.debug("###table", { table });
    this.logger.debug("###Queue URL", { queueUrl });
    this.logger.debug("###S3 Bucket", { bucket });
    this.logger.info("Waiting for messages from SQS...");
    try {
      while (true) {
        let flag: boolean = await this.processService.process(
          table,
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
