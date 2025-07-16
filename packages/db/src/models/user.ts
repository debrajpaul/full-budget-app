import { db } from '../dynamoClient';
import { PutCommand, GetCommand } from '@aws-sdk/lib-dynamodb';

const USERS_TABLE = process.env.USERS_TABLE || 'users';

export async function createUser(userId: string, email: string, passwordHash: string) {
  await db.send(
    new PutCommand({
      TableName: USERS_TABLE,
      Item: {
        userId,
        email,
        passwordHash,
        createdAt: Date.now(),
      },
      ConditionExpression: 'attribute_not_exists(userId)',
    })
  );
}

export async function getUserByEmail(email: string) {
  const result = await db.send(
    new GetCommand({
      TableName: USERS_TABLE,
      Key: { userId: email },
    })
  );
  return result.Item;
}
