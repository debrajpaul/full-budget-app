import { App } from "aws-cdk-lib";
import { StorageStack, QueueStack, TransactionsTableStack, WorkerStack } from "./stacks";

const app = new App();

new StorageStack(app, "StorageStack");
new QueueStack(app, "QueueStack");
new TransactionsTableStack(app, "TransactionsTableStack");
new WorkerStack(app, "WorkerStack", {
  env: {
    region: "ap-south-1", // or your preferred region
  },
});

// statementProcessingQueue.grantSendMessages(myServiceRole);
// this.uploadsTable.grantReadWriteData(myServiceLambdaRole);
