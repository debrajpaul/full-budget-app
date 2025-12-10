import { Stack, StackProps, aws_xray as xray } from "aws-cdk-lib";
import { Construct } from "constructs";

export class XRayStack extends Stack {
  constructor(scope: Construct, id: string, props?: StackProps) {
    super(scope, id, props);

    // The code that defines your stack goes here
    new xray.CfnSamplingRule(this, "FullBudgetAppXRaySamplingRule", {
      samplingRule: {
        ruleName: "FullBudgetAppDefaultSampling",
        version: 1,
        priority: 1,
        fixedRate: 0.1,
        reservoirSize: 1,
        host: "*",
        httpMethod: "*",
        resourceArn: "*",
        serviceName: "*",
        serviceType: "*",
        urlPath: "*",
        attributes: {},
      },
    });

    // Define an X‑Ray group to logically group all traces for the application.
    new xray.CfnGroup(this, "FullBudgetAppXRayGroup", {
      groupName: "FullBudgetAppGroup",
      // X-Ray rejects groups without a filter; this captures all services.
      filterExpression: 'service("*")',
    });
  }
}
