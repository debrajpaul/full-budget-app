import { App } from "aws-cdk-lib";
import { StorageStack, QueueStack } from "./stacks";

const app = new App();

new StorageStack(app, "StorageStack");
new QueueStack(app, "QueueStack");
