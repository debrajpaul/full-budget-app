import { SQSService } from "./sqs-client";

describe("SQSService", () => {
  let sqsMock: any;
  let loggerMock: any;
  let service: SQSService;
  const queueUrl =
    "https://sqs.us-east-1.amazonaws.com/123456789012/test-queue";
  const messageBody = { foo: "bar" };

  beforeEach(() => {
    loggerMock = {
      info: jest.fn(),
      debug: jest.fn(),
    };
    sqsMock = {
      sendMessage: jest.fn().mockResolvedValue({ MessageId: "msgid123" }),
      receiveMessage: jest.fn().mockResolvedValue({
        Messages: [
          { Body: JSON.stringify(messageBody), ReceiptHandle: "rh123" },
        ],
      }),
      deleteMessage: jest.fn().mockResolvedValue({}),
    };
    service = new SQSService(loggerMock, sqsMock);
  });

  it("should send a message to SQS", async () => {
    await service.sendFileMessage(queueUrl, messageBody);
    expect(sqsMock.sendMessage).toHaveBeenCalledWith({
      QueueUrl: queueUrl,
      MessageBody: JSON.stringify(messageBody),
    });
    expect(loggerMock.info).toHaveBeenCalledWith("#SendingSQS");
    expect(loggerMock.info).toHaveBeenCalledWith(
      "SQS message sent successfully",
    );
  });

  it("should receive and delete a message from SQS", async () => {
    const result = await service.receiveFileMessage(queueUrl);
    expect(sqsMock.receiveMessage).toHaveBeenCalledWith({
      QueueUrl: queueUrl,
      MaxNumberOfMessages: 1,
      WaitTimeSeconds: 5,
    });
    expect(sqsMock.deleteMessage).toHaveBeenCalledWith({
      QueueUrl: queueUrl,
      ReceiptHandle: "rh123",
    });
    expect(result).toEqual(messageBody);
  });

  it("should return undefined if no messages are received", async () => {
    sqsMock.receiveMessage.mockResolvedValue({ Messages: [] });
    const result = await service.receiveFileMessage(queueUrl);
    expect(result).toBeUndefined();
  });
});
