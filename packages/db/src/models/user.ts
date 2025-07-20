import { db } from "../dynamoClient";
import { PutCommand, GetCommand } from "@aws-sdk/lib-dynamodb";

export async function createUser(
  userId: string,
  email: string,
  passwordHash: string,
  tableName: string,
) {
  await db.send(
    new PutCommand({
      TableName: tableName,
      Item: {
        userId,
        email,
        passwordHash,
        createdAt: Date.now(),
      },
      ConditionExpression: "attribute_not_exists(userId)",
    }),
  );
}

export async function getUserByEmail(email: string, tableName: string) {
  const result = await db.send(
    new GetCommand({
      TableName: tableName,
      Key: { userId: email },
    }),
  );
  return result.Item;
}
