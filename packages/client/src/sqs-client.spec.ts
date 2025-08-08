import { SQSService } from "./sqs-client";
import { mock } from "jest-mock-extended";
import { ILogger, ITransactionRequest, EBankName } from "@common";
import { SQS } from "@aws-sdk/client-sqs";

describe("SQSService", () => {
  let sqsClient: SQS;
  let loggerMock: ReturnType<typeof mock<ILogger>>;
  let service: SQSService;
  const queueUrl =
    "https://sqs.us-east-1.amazonaws.com/123456789012/test-queue";
  const messageBody: ITransactionRequest = {
    bank: EBankName.hdfc,
    fileName: "test.txt",
    fileKey: "test.txt",
    userId: "user123",
    tenantId: "tenant123",
  };

  beforeEach(() => {
    loggerMock = mock<ILogger>();
    sqsClient = new SQS({});
    // Cast to any to avoid TS type errors for mocking
    (sqsClient as any).sendMessage = jest
      .fn()
      .mockResolvedValue({ MessageId: "msgid123" });
    (sqsClient as any).receiveMessage = jest.fn().mockResolvedValue({
      Messages: [{ Body: JSON.stringify(messageBody), ReceiptHandle: "rh123" }],
    });
    (sqsClient as any).deleteMessage = jest.fn().mockResolvedValue({});
    service = new SQSService(loggerMock, queueUrl, sqsClient);
  });

  it("should send a message to SQS", async () => {
    await service.sendFileMessage(messageBody);
    expect((sqsClient as any).sendMessage).toHaveBeenCalledWith({
      QueueUrl: queueUrl,
      MessageBody: JSON.stringify(messageBody),
    });
    expect(loggerMock.info).toHaveBeenCalledWith("#SendingSQS");
    expect(loggerMock.info).toHaveBeenCalledWith(
      "SQS message sent successfully",
    );
  });

  it("should receive and delete a message from SQS", async () => {
    const result = await service.receiveFileMessage();
    expect((sqsClient as any).receiveMessage).toHaveBeenCalledWith({
      QueueUrl: queueUrl,
      MaxNumberOfMessages: 1,
      WaitTimeSeconds: 5,
    });
    expect((sqsClient as any).deleteMessage).toHaveBeenCalledWith({
      QueueUrl: queueUrl,
      ReceiptHandle: "rh123",
    });
    expect(result).toEqual(messageBody);
  });

  it("should return undefined if no messages are received", async () => {
    (sqsClient as any).receiveMessage.mockResolvedValue({ Messages: [] });
    const result = await service.receiveFileMessage();
    expect(result).toBeUndefined();
  });
});
