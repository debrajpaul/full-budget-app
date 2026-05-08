import { SQSRecord, SQSBatchResponse, SQSBatchItemFailure } from "aws-lambda";
import { ILogger, ITransactionService, ITransactionSqsRequest } from "@common";

export class TransactionLoader {
  // Instance-level dedup: prevents the same jobId being processed twice
  // within a single Lambda invocation (handles SQS at-least-once re-delivery).
  private readonly processedJobIds = new Set<string>();

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

        if (this.processedJobIds.has(body.jobId)) {
          this.logger.debug("Skipping duplicate jobId within this invocation", {
            jobId: body.jobId,
            messageId: record.messageId,
          });
          continue;
        }

        await this.transactionService.process(body);
        this.processedJobIds.add(body.jobId);
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
