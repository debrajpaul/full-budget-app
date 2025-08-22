import { handler } from "./index";
import { SQSEvent } from "aws-lambda";
import { ETenantType, EBankName } from "@common";

const mockEvent: SQSEvent = {
  Records: [
    {
      messageId: "1",
      receiptHandle: "mock-handle",
      body: JSON.stringify({
        bankName: EBankName.other,
        fileName: "mock.csv",
        fileKey: "mock.csv",
        userId: "user-1",
        tenantId: ETenantType.default,
      }),
      attributes: {
        ApproximateReceiveCount: "1",
        SentTimestamp: Date.now().toString(),
        SenderId: "mock",
        ApproximateFirstReceiveTimestamp: Date.now().toString(),
      },
      messageAttributes: {},
      md5OfBody: "md5",
      eventSource: "aws:sqs",
      eventSourceARN: "arn:aws:sqs:us-east-1:123456789012:Transactions",
      awsRegion: "us-east-1",
    },
  ],
};

handler(mockEvent)
  .then((res) => console.log("handler result", res))
  .catch((err) => console.error(err));