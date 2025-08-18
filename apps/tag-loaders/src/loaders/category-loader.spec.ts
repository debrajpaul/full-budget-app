import { DynamoDBRecord } from "aws-lambda";
import { mock } from "jest-mock-extended";
import { ILogger, ITransactionCategoryService, ETenantType } from "@common";
import { TransactionCategoryLoader } from "./category-loader";

describe("TransactionCategoryLoader", () => {
  it("should map record to request with createdAt and AI metadata", async () => {
    const logger = mock<ILogger>();
    const service = mock<ITransactionCategoryService>();
    const loader = new TransactionCategoryLoader(logger, service);

    const record = {
      eventID: "1",
      eventName: "INSERT",
      dynamodb: {
        NewImage: {
          tenantId: { S: ETenantType.default },
          transactionId: { S: "t1" },
          description: { S: "desc" },
          category: { S: "" },
          createdAt: { S: "2024-01-01T00:00:00.000Z" },
          embedding: { L: [{ N: "0.1" }, { N: "0.2" }] },
          taggedBy: { S: "AI_TAGGER" },
          confidence: { N: "0.9" },
        },
      },
    } as unknown as DynamoDBRecord;

    await loader.handle([record]);

    expect(service.process).toHaveBeenCalledWith({
      tenantId: ETenantType.default,
      transactionId: "t1",
      description: "desc",
      category: "",
      createdAt: "2024-01-01T00:00:00.000Z",
      embedding: [0.1, 0.2],
      taggedBy: "AI_TAGGER",
      confidence: 0.9,
    });
  });

  it("should default createdAt and omit AI metadata when missing", async () => {
    const logger = mock<ILogger>();
    const service = mock<ITransactionCategoryService>();
    const loader = new TransactionCategoryLoader(logger, service);

    const fixedDate = new Date("2024-02-02T03:04:05.000Z");
    jest.useFakeTimers().setSystemTime(fixedDate);

    const record = {
      eventID: "2",
      eventName: "INSERT",
      dynamodb: {
        NewImage: {
          tenantId: { S: ETenantType.default },
          transactionId: { S: "t2" },
          description: { S: "no meta" },
        },
      },
    } as unknown as DynamoDBRecord;

    await loader.handle([record]);

    expect(service.process).toHaveBeenCalledWith({
      tenantId: ETenantType.default,
      transactionId: "t2",
      description: "no meta",
      category: undefined,
      createdAt: fixedDate.toISOString(),
      embedding: undefined,
      taggedBy: undefined,
      confidence: undefined,
    });

    jest.useRealTimers();
  });
});
