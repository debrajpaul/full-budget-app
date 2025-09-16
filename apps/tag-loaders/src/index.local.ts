import { DynamoDBStreamEvent } from "aws-lambda";
import { WinstonLogger } from "@logger";
import { LogLevel, IBedrockClient } from "@common";
import {
  DynamoDBDocumentClient,
  QueryCommand,
  UpdateCommand,
} from "@aws-sdk/lib-dynamodb";

// Local test harness that simulates an unclassified stream record,
// stubs Bedrock and DynamoDB, and asserts the writeback payload.

// Ensure required env flags for tag-loaders (set BEFORE importing setup modules)
process.env.AI_TAGGING_ENABLED = "true";
process.env.DYNAMO_CATEGORY_RULES_TABLE =
  process.env.DYNAMO_CATEGORY_RULES_TABLE || "local-category-rules";
process.env.DYNAMO_TRANSACTION_TABLE =
  process.env.DYNAMO_TRANSACTION_TABLE || "local-transactions";
process.env.AWS_REGION = process.env.AWS_REGION || "us-east-1";

const logger = WinstonLogger.getInstance(LogLevel.DEBUG, "tag-loaders-local");

// Fake Bedrock client that returns a deterministic category
class FakeBedrockClient implements IBedrockClient {
  public calls: string[] = [];
  async invokeModel(description: string): Promise<any> {
    this.calls.push(description);
    const payload = {
      base: "EXPENSES",
      sub: "FOOD",
      reason: "Mocked classification",
      confidence: 0.86,
    };
    return { body: new TextEncoder().encode(JSON.stringify(payload)) };
  }
}

// Fake DynamoDB DocumentClient that serves empty rules and captures updates
type UpdateCapture = {
  TableName?: string;
  Key?: any;
  UpdateExpression?: string;
  ExpressionAttributeValues?: Record<string, any>;
};

const updateCapture: UpdateCapture = {};

const fakeDdb = {
  send: async (command: any) => {
    if (command instanceof QueryCommand) {
      // No rules present to force UNCLASSIFIED via rules
      return { Items: [] };
    }
    if (command instanceof UpdateCommand) {
      const input = (command as any).input || {};
      updateCapture.TableName = input.TableName;
      updateCapture.Key = input.Key;
      updateCapture.UpdateExpression = input.UpdateExpression;
      updateCapture.ExpressionAttributeValues =
        input.ExpressionAttributeValues;
      return { Attributes: {} };
    }
    return {};
  },
} as unknown as DynamoDBDocumentClient;

async function run() {
  // Import after env is set so config picks up overrides
  const { setupServices } = await import("./setup-services");
  const { setupLoaders } = await import("./setup-loaders");
  const bedrockClient = new FakeBedrockClient();

  const { transactionCategoryService } = setupServices(
    logger,
    fakeDdb,
    bedrockClient,
  );
  const { transactionCategoryLoader } = setupLoaders(
    logger,
    transactionCategoryService,
  );

  const event: DynamoDBStreamEvent = {
    Records: [
      {
        eventID: "1",
        eventName: "INSERT",
        eventVersion: "1.0",
        eventSource: "aws:dynamodb",
        awsRegion: process.env.AWS_REGION!,
        dynamodb: {
          Keys: { transactionId: { S: "user1#tx1" } },
          NewImage: {
            tenantId: { S: "default" },
            transactionId: { S: "user1#tx1" },
            description: { S: "Coffee at Starbucks" },
            category: { S: "UNCLASSIFIED" },
          },
          SequenceNumber: "1",
          SizeBytes: 1,
          StreamViewType: "NEW_AND_OLD_IMAGES",
        },
        eventSourceARN:
          "arn:aws:dynamodb:us-east-1:000000000000:table/Transactions/stream/2020-01-01T00:00:00.000",
      },
    ],
  };

  await transactionCategoryLoader.loader(event.Records);

  // Verify Bedrock was invoked
  const bedrockCalls = (bedrockClient as FakeBedrockClient).calls.length;
  const values = updateCapture.ExpressionAttributeValues || {};
  const resultSummary = {
    bedrockCalls,
    table: updateCapture.TableName,
    key: updateCapture.Key,
    category: values[":cat"],
    subCategory: values[":subCat"],
    taggedBy: values[":tagger"],
    confidence: values[":conf"],
  };

  // Basic assertions
  const ok =
    bedrockCalls === 1 &&
    resultSummary.category === "EXPENSES" &&
    resultSummary.subCategory === "FOOD" &&
    resultSummary.taggedBy === "BEDROCK" &&
    typeof resultSummary.confidence === "number" &&
    resultSummary.confidence >= 0.5;

  if (!ok) {
    console.error("Local test FAILED", resultSummary);
    process.exit(1);
  }

  console.log("Local test PASSED", resultSummary);
  process.exit(0);
}

run().catch((err) => {
  console.error("Error in local test:", err);
  process.exit(1);
});
