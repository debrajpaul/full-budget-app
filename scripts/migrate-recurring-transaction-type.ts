/**
 * One-off migration: backfill `type` (INCOME | EXPENSE) on RecurringTransaction records.
 *
 * Targets the table in DYNAMO_RECURRING_TABLE (defaults to "recurring-transactions").
 * Points at LocalStack when USE_LOCALSTACK=true (the default for local development).
 *
 * Usage
 * ─────
 *   # Dry run (no writes) against LocalStack:
 *   USE_LOCALSTACK=true pnpm exec ts-node -r tsconfig-paths/register \
 *     scripts/migrate-recurring-transaction-type.ts --dry-run
 *
 *   # Live run against LocalStack:
 *   USE_LOCALSTACK=true pnpm exec ts-node -r tsconfig-paths/register \
 *     scripts/migrate-recurring-transaction-type.ts
 *
 *   # Live run against AWS (ensure AWS_REGION / credentials are set):
 *   USE_LOCALSTACK=false pnpm exec ts-node -r tsconfig-paths/register \
 *     scripts/migrate-recurring-transaction-type.ts
 *
 * Exit codes
 * ──────────
 *   0  Migration completed (or dry-run completed) without errors.
 *   1  One or more records failed to update; details logged above.
 */

import * as dotenv from "dotenv";
import { DynamoDB } from "@aws-sdk/client-dynamodb";
import {
  DynamoDBDocumentClient,
  ScanCommand,
  UpdateCommand,
} from "@aws-sdk/lib-dynamodb";
import {
  ETransactionType,
  inferTransactionType,
} from "../packages/common/src/abstractions/recurring/recurring-transaction";

dotenv.config();

const DRY_RUN = process.argv.includes("--dry-run");
const TABLE = process.env.DYNAMO_RECURRING_TABLE ?? "recurring-transactions";
const USE_LOCALSTACK = process.env.USE_LOCALSTACK !== "false"; // default true
const LOCALSTACK_HOST = process.env.LOCALSTACK_HOST ?? "localhost";
const LOCALSTACK_EDGE_PORT = process.env.LOCALSTACK_EDGE_PORT ?? "4566";

const rawClient = new DynamoDB({
  region: process.env.AWS_REGION ?? "us-east-1",
  ...(USE_LOCALSTACK && {
    endpoint: `http://${LOCALSTACK_HOST}:${LOCALSTACK_EDGE_PORT}`,
    credentials: {
      accessKeyId: process.env.AWS_ACCESS_KEY_ID ?? "test",
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY ?? "test",
    },
  }),
});

const db = DynamoDBDocumentClient.from(rawClient, {
  marshallOptions: { removeUndefinedValues: true },
});

async function run(): Promise<void> {
  console.log("╔══════════════════════════════════════════════════════╗");
  console.log("║  migrate-recurring-transaction-type                   ║");
  console.log("╚══════════════════════════════════════════════════════╝");
  console.log(`  table    : ${TABLE}`);
  console.log(
    `  endpoint : ${USE_LOCALSTACK ? `LocalStack @ ${LOCALSTACK_HOST}:${LOCALSTACK_EDGE_PORT}` : "AWS"}`
  );
  console.log(`  dry-run  : ${DRY_RUN}`);
  console.log("");

  let scanned = 0;
  let alreadySet = 0;
  let updated = 0;
  let failed = 0;
  let lastKey: Record<string, unknown> | undefined;

  do {
    const page = await db.send(
      new ScanCommand({
        TableName: TABLE,
        ExclusiveStartKey: lastKey,
      })
    );

    for (const item of page.Items ?? []) {
      scanned++;

      if (item["type"] !== undefined) {
        alreadySet++;
        continue;
      }

      const amount = Number(item["amount"]) || 0;
      const category = typeof item["category"] === "string"
        ? item["category"]
        : undefined;
      const inferred: ETransactionType = inferTransactionType(amount, category);

      const tag = DRY_RUN ? "DRY" : "UPD";
      console.log(
        `  [${tag}] ${String(item["recurringId"])}` +
          `  amount=${amount}  category=${category ?? "—"}  → type=${inferred}`
      );

      if (!DRY_RUN) {
        try {
          await db.send(
            new UpdateCommand({
              TableName: TABLE,
              Key: {
                tenantId: item["tenantId"],
                recurringId: item["recurringId"],
              },
              UpdateExpression: "SET #t = :type",
              ExpressionAttributeNames: { "#t": "type" },
              ExpressionAttributeValues: { ":type": inferred },
              ConditionExpression: "attribute_exists(tenantId)",
            })
          );
          updated++;
        } catch (err) {
          console.error(
            `  [ERR] Failed to update ${String(item["recurringId"])}: ${(err as Error).message}`
          );
          failed++;
        }
      } else {
        updated++;
      }
    }

    lastKey = page.LastEvaluatedKey as Record<string, unknown> | undefined;
  } while (lastKey !== undefined);

  console.log("");
  console.log("── Summary ──────────────────────────────────────────────");
  console.log(`  scanned       : ${scanned}`);
  console.log(`  already set   : ${alreadySet}`);
  console.log(`  ${DRY_RUN ? "would update" : "updated"}   : ${updated}`);
  if (!DRY_RUN) {
    console.log(`  failed        : ${failed}`);
  }

  if (failed > 0) {
    process.exit(1);
  }
}

run().catch((err: unknown) => {
  console.error("Migration aborted:", err);
  process.exit(1);
});
