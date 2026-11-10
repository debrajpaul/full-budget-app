import { Stack, StackProps } from "aws-cdk-lib";
import { Construct } from "constructs";
import { StringParameter } from "aws-cdk-lib/aws-ssm";
import { resolveStage } from "./stage-config";

export class SsmParamStack extends Stack {
  public readonly parameter: StringParameter;

  constructor(scope: Construct, id: string, props?: StackProps) {
    super(scope, id, props);

    const { jwtParameterName } = resolveStage(this);

    this.parameter = StringParameter.fromStringParameterName(
      this,
      "SsmParameter",
      jwtParameterName
    ) as StringParameter;
  }
}
