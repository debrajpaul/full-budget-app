import { DynamoDBRecord } from "aws-lambda";
import { ILogger, ITransactionCategoryService } from "@common";

export class TransactionCategoryLoader {
  constructor(
    private readonly logger: ILogger,
    private readonly transactionCategoryService: ITransactionCategoryService,
  ) {}

  public async handle(records: DynamoDBRecord[]) {
    this.logger.info(`Handling ${records.length} records`);
    this.logger.debug("Handling records", { records });
    for (const record of records) {
      this.logger.info(`Processing record: ${record.eventID}`);
      if (record.eventName !== "INSERT" && record.eventName !== "MODIFY") {
        continue; // only process new or updated transactions
      }
      const newImage = record.dynamodb?.NewImage;
      if (!newImage) continue;
      await this.transactionCategoryService.process(newImage);
    }
  }
}
