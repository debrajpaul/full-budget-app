import { SQSRecord } from "aws-lambda";
import { ILogger, ITransactionService, ITransactionRequest } from "@common";

export class TransactionController {
  constructor(
    private readonly logger: ILogger,
    private readonly transactionService: ITransactionService,
  ) {}

  public async handle(records: SQSRecord[]) {
    this.logger.info(`Handling ${records.length} records`);
    this.logger.debug("Handling records", { records });
    for (const record of records) {
      this.logger.info(`Processing record: ${record.messageId}`);
      const body = JSON.parse(record.body) as ITransactionRequest;
      await this.transactionService.process(body);
    }
  }
}
