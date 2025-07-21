import { db } from "../dynamoClient";
import { IUser, IUserUpdate } from "@common";
import { PutCommand, GetCommand, UpdateCommand } from "@aws-sdk/lib-dynamodb";

export async function getUser(email: string, tableName: string) {
  const result = await db.send(
    new GetCommand({
      TableName: tableName,
      Key: { email },
    }),
  );
  return result.Item as IUser | undefined;
}

export async function saveUser(user: IUser, tableName: string) {
  const item = {
    email: user.email, // Partition Key
    name: user.name,
    passwordHash: user.passwordHash,
    createdAt: user.createdAt.toISOString(),
    updatedAt: user.updatedAt.toISOString(),
    isActive: user.isActive,
    ...(user.deletedAt && { deletedAt: user.deletedAt.toISOString() }),
    ...(user.lastLogin && { lastLogin: user.lastLogin.toISOString() }),
  };

  await db.send(
    new PutCommand({
      TableName: tableName,
      Item: item,
      ConditionExpression: "attribute_not_exists(email)",
    }),
  );
}

export async function updateUser(input: IUserUpdate) {
  const { email, ...rest } = input;

  const updateExpressions: string[] = [];
  const expressionAttributeValues: Record<string, any> = {};
  const expressionAttributeNames: Record<string, string> = {};

  for (const key in rest) {
    const value = rest[key as keyof typeof rest];
    if (value !== undefined) {
      const attr = `#${key}`;
      const val = `:${key}`;
      updateExpressions.push(`${attr} = ${val}`);
      expressionAttributeNames[attr] = key;
      expressionAttributeValues[val] =
        value instanceof Date ? value.toISOString() : value;
    }
  }

  if (updateExpressions.length === 0) return;

  updateExpressions.push(`#updatedAt = :updatedAt`);
  expressionAttributeNames["#updatedAt"] = "updatedAt";
  expressionAttributeValues[":updatedAt"] = new Date().toISOString();

  await db.send(
    new UpdateCommand({
      TableName: "users",
      Key: { email },
      UpdateExpression: "SET " + updateExpressions.join(", "),
      ExpressionAttributeNames: expressionAttributeNames,
      ExpressionAttributeValues: expressionAttributeValues,
    }),
  );
}
