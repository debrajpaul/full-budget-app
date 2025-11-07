import { SQSRecord } from "aws-lambda";
import { ILogger, ITransactionService, ITransactionSqsRequest } from "@common";

export class TransactionLoader {
  constructor(
    private readonly logger: ILogger,
    private readonly transactionService: ITransactionService,
  ) {}

  public async loader(records: SQSRecord[]) {
    this.logger.info(`Loading ${records.length} records`);
    this.logger.debug("Loading records", { records });
    for (const record of records) {
      this.logger.debug(`Processing loader record: ${record.messageId}`);
      const body = JSON.parse(record.body) as ITransactionSqsRequest;
      await this.transactionService.process(body);
    }
  }
}
