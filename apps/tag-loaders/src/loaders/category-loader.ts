import { DynamoDBRecord } from "aws-lambda";
import {
  ILogger,
  ITransactionCategoryService,
  ITransactionCategoryRequest,
  ETenantType,
} from "@common";

export class TransactionCategoryLoader {
  constructor(
    private readonly logger: ILogger,
    private readonly transactionCategoryService: ITransactionCategoryService,
  ) {}

  public async loader(records: DynamoDBRecord[]) {
    this.logger.info(`transaction_category_loader ${records.length} records`);
    this.logger.debug("transaction_category_loader records", { records });
    for (const record of records) {
      this.logger.info(`Processing record: ${record.eventID}`);
      if (record.eventName !== "INSERT" && record.eventName !== "MODIFY") {
        continue; // only process new or updated transactions
      }
      const newImage = record.dynamodb?.NewImage;
      if (!newImage) continue;
      const request: ITransactionCategoryRequest = {
        tenantId: (newImage.tenantId?.S as ETenantType) ?? ETenantType.default,
        transactionId: newImage.transactionId?.S ?? "",
        description: newImage.description?.S,
        category: newImage.category?.S,
        createdAt: newImage.createdAt?.S ?? new Date().toISOString(),
        embedding:
          newImage.embedding?.L?.map((e: any) => Number(e.N)) ?? undefined,
        taggedBy: newImage.taggedBy?.S,
        confidence: newImage.confidence?.N
          ? Number(newImage.confidence.N)
          : undefined,
      };
      await this.transactionCategoryService.process(request);
    }
  }
}
