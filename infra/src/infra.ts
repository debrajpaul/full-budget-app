import { App } from "aws-cdk-lib";
import { StorageStack, QueueStack, TransactionsTableStack } from "./stacks";

const app = new App();

new StorageStack(app, "StorageStack");
new QueueStack(app, "QueueStack");
new TransactionsTableStack(app, "TransactionsTableStack");

// statementProcessingQueue.grantSendMessages(myServiceRole);
// this.uploadsTable.grantReadWriteData(myServiceLambdaRole);
