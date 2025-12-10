import {
  DynamoDBRecord,
  AttributeValue,
  DynamoDBBatchResponse,
  DynamoDBBatchItemFailure,
} from "aws-lambda";
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

  public async loader(
    records: DynamoDBRecord[],
  ): Promise<DynamoDBBatchResponse> {
    this.logger.debug(`Loader ${records.length} records`);
    this.logger.debug("Loader records", { records });
    const failures: DynamoDBBatchItemFailure[] = [];
    for (const record of records) {
      try {
        this.logger.debug(`Processing record: ${record.eventID}`);
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
        const tenantId = newImage.tenantId?.S as ETenantType;
        if (
          !tenantId ||
          !(
            tenantId === ETenantType.client || tenantId === ETenantType.personal
          )
        ) {
          this.logger.debug("Skipping record without tenantId", {
            eventID: record.eventID,
            description: newImage?.tenantId?.S,
          });
          continue;
        }
        const transactionId = newImage.transactionId?.S;
        if (!transactionId || transactionId.trim().length === 0) {
          this.logger.debug("Skipping record without transactionId", {
            eventID: record.eventID,
            description: newImage?.transactionId?.S,
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
        const category = newImage.category?.S as EBaseCategories;
        if (category && category !== EBaseCategories.unclassified) {
          this.logger.debug("Skipping record with category and not been", {
            eventID: record.eventID,
            description: newImage?.category?.S,
          });
          continue;
        }
        const request: ITransactionCategoryRequest = {
          tenantId,
          transactionId,
          description,
          category,
          debit: newImage.debit?.N ? Number(newImage.debit.N) : 0,
          credit: newImage.credit?.N ? Number(newImage.credit.N) : 0,
          createdAt: newImage.createdAt?.S ?? new Date().toISOString(),
          embedding:
            newImage.embedding?.L?.map((e: AttributeValue) =>
              Number(e.N || 0),
            ) ?? undefined,
          taggedBy: newImage.taggedBy?.S,
          confidence: newImage.confidence?.N
            ? Number(newImage.confidence.N)
            : undefined,
        };
        await this.transactionCategoryService.process(request);
      } catch (error) {
        this.logger.error(
          "[transaction worker] failed to process message",
          error as Error,
          { messageId: record.eventID },
        );
        failures.push({ itemIdentifier: record.eventID || "unknown" });
      }
    }
    return { batchItemFailures: failures };
  }
}
