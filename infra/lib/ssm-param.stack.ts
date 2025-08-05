import { Stack, StackProps } from 'aws-cdk-lib';
import { Construct } from 'constructs';
import { StringParameter } from 'aws-cdk-lib/aws-ssm';

export class SsmParamStack extends Stack {
  public readonly parameter: StringParameter;

  constructor(scope: Construct, id: string, props?: StackProps) {
    super(scope, id, props);

    this.parameter = new StringParameter(this, 'SsmParameter', {
      parameterName: 'jwt-secret',
      stringValue: 'your-jwt-secret-value-here', // replace securely!
    });
  }
}
