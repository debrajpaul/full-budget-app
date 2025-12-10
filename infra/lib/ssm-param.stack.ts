import { Stack, StackProps } from "aws-cdk-lib";
import { Construct } from "constructs";
import { StringParameter } from "aws-cdk-lib/aws-ssm";

export class SsmParamStack extends Stack {
  public readonly parameter: StringParameter;

  constructor(scope: Construct, id: string, props?: StackProps) {
    super(scope, id, props);

    this.parameter = StringParameter.fromStringParameterName(
      this,
      "SsmParameter",
      "jwt-secret"
    ) as StringParameter;
  }
}
