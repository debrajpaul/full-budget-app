import { db } from "../dynamoClient";
import { PutCommand } from "@aws-sdk/lib-dynamodb";

export type TransactionItem = {
  userId: string;
  transactionId: string;
  date: string;
  amount: number;
  balance?: number;
  description: string;
};

export async function saveTransaction(txn: TransactionItem, tableName: string) {
  try {
    const command = new PutCommand({
      TableName: tableName,
      Item: {
        PK: `USER#${txn.userId}`,
        SK: `TXN#${txn.transactionId}`,
        ...txn,
      },
      ConditionExpression:
        "attribute_not_exists(PK) AND attribute_not_exists(SK)",
    });

    await db.send(command);
  } catch (error: any) {
    if (error.name === "ConditionalCheckFailedException") {
      console.warn(`Duplicate transaction ignored: ${txn.transactionId}`);
      return; // or return false, or throw, based on your logic
    }
    console.error("Error saving transaction:", error);
    throw new Error(`Failed to save transaction: ${error.message}`);
  }
}
