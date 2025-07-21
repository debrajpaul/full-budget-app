import { App } from "aws-cdk-lib";
import { StorageStack } from "./stacks";

const app = new App();

new StorageStack(app, "StorageStack");
