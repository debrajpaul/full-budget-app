import { handler } from "./index";
import { DynamoDBStreamEvent } from "aws-lambda";

const mockEvent: DynamoDBStreamEvent = {
  Records: [
    {
      eventID: "1",
      eventName: "INSERT",
      eventVersion: "1.0",
      eventSource: "aws:dynamodb",
      awsRegion: "us-east-1",
      dynamodb: {
        Keys: { transactionId: { S: "1" } },
        NewImage: {
          tenantId: { S: "default" },
          transactionId: { S: "1" },
          description: { S: "Mock transaction" },
        },
        SequenceNumber: "1",
        SizeBytes: 1,
        StreamViewType: "NEW_AND_OLD_IMAGES",
      },
      eventSourceARN:
        "arn:aws:dynamodb:us-east-1:123456789012:table/Transactions/stream/2020-01-01T00:00:00.000",
    },
  ],
};

handler(mockEvent)
  .then((res) => console.log("handler result", res))
  .catch((err) => console.error(err));
