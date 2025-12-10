import { SQSRecord, SQSBatchResponse, SQSBatchItemFailure } from "aws-lambda";
import { ILogger, ITransactionService, ITransactionSqsRequest } from "@common";

export class TransactionLoader {
  constructor(
    private readonly logger: ILogger,
    private readonly transactionService: ITransactionService
  ) {}

  public async loader(records: SQSRecord[]): Promise<SQSBatchResponse> {
    this.logger.info(`Loading ${records.length} records`);
    this.logger.debug("Loading records", { records });
    const failures: SQSBatchItemFailure[] = [];
    for (const record of records) {
      try {
        this.logger.debug(`Processing loader record: ${record.messageId}`);
        const body = JSON.parse(record.body) as ITransactionSqsRequest;
        await this.transactionService.process(body);
      } catch (error) {
        this.logger.error(
          "[transaction worker] failed to process message",
          error as Error,
          { messageId: record.messageId }
        );
        failures.push({ itemIdentifier: record.messageId });
      }
    }
    return { batchItemFailures: failures };
  }
}
