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

  public async loader(records: DynamoDBRecord[]) {
    this.logger.info(`Loader ${records.length} records`);
    this.logger.debug("Loader records", { records });
    for (const record of records) {
      this.logger.info(`Processing record: ${record.eventID}`);
      if (record.eventName !== "INSERT" && record.eventName !== "MODIFY") {
        this.logger.debug("Skipping record with eventName", {
          eventID: record.eventID,
          eventName: record.eventName,
        });
        continue; // only process new or updated transactions
      }
      const newImage = record.dynamodb?.NewImage;
      if (!newImage) {
        this.logger.debug("Skipping record without NewImage", {
          eventID: record.eventID,
          newImage: newImage,
        });
        continue;
      }
      const description = newImage.description?.S;
      if (!description || description.trim().length === 0) {
        this.logger.debug("Skipping record without description", {
          eventID: record.eventID,
          description: newImage?.description?.S,
        });
        continue;
      }
      const request: ITransactionCategoryRequest = {
        tenantId: (newImage.tenantId?.S as ETenantType) ?? ETenantType.default,
        transactionId: newImage.transactionId?.S ?? "",
        description,
        category:
          (newImage.category?.S as EBaseCategories) ??
          EBaseCategories.unclassified,
        amount: newImage.amount?.N ? Number(newImage.amount.N) : undefined,
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
