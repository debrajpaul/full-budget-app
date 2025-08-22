import { SQSRecord } from "aws-lambda";
import { ILogger, ITransactionService, ITransactionRequest } from "@common";

export class TransactionLoader {
  constructor(
    private readonly logger: ILogger,
    private readonly transactionService: ITransactionService,
  ) {}

  public async loader(records: SQSRecord[]) {
    this.logger.info(`Loading ${records.length} records`);
    this.logger.debug("Loading records", { records });
    for (const record of records) {
      this.logger.info(`Processing loader record: ${record.messageId}`);
      const body = JSON.parse(record.body) as ITransactionRequest;
      await this.transactionService.process(body);
    }
  }
}
