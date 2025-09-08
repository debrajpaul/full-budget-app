import { DynamoDBRecord, AttributeValue } from "aws-lambda";
import {
  ILogger,
  ITransactionCategoryService,
  ITransactionCategoryRequest,
  ETenantType,
  EBaseCategories,
} from "@common";

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
      const request: ITransactionCategoryRequest = {
        tenantId: (newImage.tenantId?.S as ETenantType) ?? ETenantType.default,
        transactionId: newImage.transactionId?.S ?? "",
        description: newImage.description?.S,
        category:
          (newImage.category?.S as EBaseCategories) ?? EBaseCategories.default,
        createdAt: newImage.createdAt?.S ?? new Date().toISOString(),
        embedding:
          newImage.embedding?.L?.map((e: AttributeValue) => Number(e.N || 0)) ??
          undefined,
        taggedBy: newImage.taggedBy?.S,
        confidence: newImage.confidence?.N
          ? Number(newImage.confidence.N)
          : undefined,
      };
      await this.transactionCategoryService.process(request);
    }
  }
}
