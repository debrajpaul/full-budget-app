import { StackContext, Table } from "sst/constructs";

export function UsersTable({ stack }: StackContext) {
  const usersTable = new Table(stack, "Users", {
    fields: {
      PK: "string",
    },
    primaryIndex: { partitionKey: "PK" },
    billingMode: "PAY_PER_REQUEST",
    pointInTimeRecovery: true,
    tableName: "users",
  });

  return usersTable;
}
