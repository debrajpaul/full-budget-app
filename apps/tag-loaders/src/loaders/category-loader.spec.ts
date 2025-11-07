import { DynamoDBRecord } from "aws-lambda";
import { mock, MockProxy } from "jest-mock-extended";
import {
  ILogger,
  ITransactionCategoryService,
  ETenantType,
  EBaseCategories,
} from "@common";
import { TransactionCategoryLoader } from "./category-loader";

describe("TransactionCategoryLoader", () => {
  let logger: MockProxy<ILogger>;
  let service: MockProxy<ITransactionCategoryService>;
  let loader: TransactionCategoryLoader;

  beforeEach(() => {
    logger = mock<ILogger>();
    service = mock<ITransactionCategoryService>();
    loader = new TransactionCategoryLoader(logger, service);
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it("maps debit/credit values and AI metadata", async () => {
    const record = {
      eventID: "1",
      eventName: "INSERT",
      dynamodb: {
        NewImage: {
          tenantId: { S: ETenantType.default },
          transactionId: { S: "t1" },
          description: { S: "desc" },
          category: { S: EBaseCategories.expenses },
          debit: { N: "12.34" },
          credit: { N: "4.56" },
          createdAt: { S: "2024-01-01T00:00:00.000Z" },
          embedding: { L: [{ N: "0.1" }, { N: "0.2" }] },
          taggedBy: { S: "RULE_ENGINE" },
          confidence: { N: "0.9" },
        },
      },
    } as unknown as DynamoDBRecord;

    await loader.loader([record]);

    expect(service.process).toHaveBeenCalledWith({
      tenantId: ETenantType.default,
      transactionId: "t1",
      description: "desc",
      category: EBaseCategories.expenses,
      debit: 12.34,
      credit: 4.56,
      createdAt: "2024-01-01T00:00:00.000Z",
      embedding: [0.1, 0.2],
      taggedBy: "RULE_ENGINE",
      confidence: 0.9,
    });
  });

  it("defaults createdAt, tenant, and monetary fields when missing", async () => {
    const fixedDate = new Date("2024-02-02T03:04:05.000Z");
    jest.useFakeTimers();
    jest.setSystemTime(fixedDate);

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

    await loader.loader([record]);

    expect(service.process).toHaveBeenCalledWith({
      tenantId: ETenantType.default,
      transactionId: "t2",
      description: "no meta",
      category: EBaseCategories.unclassified,
      debit: 0,
      credit: 0,
      createdAt: fixedDate.toISOString(),
      embedding: undefined,
      taggedBy: undefined,
      confidence: undefined,
    });
  });

  it("processes MODIFY events", async () => {
    const record = {
      eventID: "3",
      eventName: "MODIFY",
      dynamodb: {
        NewImage: {
          tenantId: { S: ETenantType.default },
          transactionId: { S: "t3" },
          description: { S: "updated" },
        },
      },
    } as unknown as DynamoDBRecord;

    await loader.loader([record]);

    expect(service.process).toHaveBeenCalledWith(
      expect.objectContaining({
        transactionId: "t3",
        description: "updated",
      }),
    );
  });

  it("skips records with unsupported event names", async () => {
    const record = {
      eventID: "4",
      eventName: "REMOVE",
      dynamodb: {
        NewImage: {
          tenantId: { S: ETenantType.default },
          transactionId: { S: "t4" },
          description: { S: "should skip" },
        },
      },
    } as unknown as DynamoDBRecord;

    await loader.loader([record]);

    expect(service.process).not.toHaveBeenCalled();
  });

  it("skips records without a NewImage payload", async () => {
    const record = {
      eventID: "5",
      eventName: "INSERT",
      dynamodb: {},
    } as unknown as DynamoDBRecord;

    await loader.loader([record]);

    expect(service.process).not.toHaveBeenCalled();
  });

  it("skips records missing description", async () => {
    const record = {
      eventID: "6",
      eventName: "INSERT",
      dynamodb: {
        NewImage: {
          tenantId: { S: ETenantType.default },
        },
      },
    } as unknown as DynamoDBRecord;

    await loader.loader([record]);

    expect(service.process).not.toHaveBeenCalled();
  });

  it("skips records with blank description", async () => {
    const record = {
      eventID: "7",
      eventName: "INSERT",
      dynamodb: {
        NewImage: {
          tenantId: { S: ETenantType.default },
          description: { S: "   " },
        },
      },
    } as unknown as DynamoDBRecord;

    await loader.loader([record]);

    expect(service.process).not.toHaveBeenCalled();
  });
});
