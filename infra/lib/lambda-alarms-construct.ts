import { Construct } from 'constructs';
import { Alarm, ComparisonOperator, TreatMissingData } from 'aws-cdk-lib/aws-cloudwatch';
import { IFunction } from 'aws-cdk-lib/aws-lambda';

interface LambdaAlarmsConstructProps {
  lambdaFn: IFunction;
  alarmPrefix?: string;
  errorThreshold?: number;
  durationThresholdMs?: number;
  evaluationPeriods?: number;
}

export class LambdaAlarmsConstruct extends Construct {
  constructor(scope: Construct, id: string, props: LambdaAlarmsConstructProps) {
    super(scope, id);

    const {
      lambdaFn,
      alarmPrefix = lambdaFn.functionName,
      errorThreshold = 1,
      durationThresholdMs = 10000,
      evaluationPeriods = 1,
    } = props;

    // Error Alarm
    new Alarm(this, `${alarmPrefix}ErrorsAlarm`, {
      metric: lambdaFn.metricErrors(),
      threshold: errorThreshold,
      evaluationPeriods,
      comparisonOperator: ComparisonOperator.GREATER_THAN_OR_EQUAL_TO_THRESHOLD,
      treatMissingData: TreatMissingData.NOT_BREACHING,
      alarmDescription: `${alarmPrefix} has >= ${errorThreshold} errors.`,
      alarmName: `${alarmPrefix}-Errors`,
    });

    // Duration Alarm
    new Alarm(this, `${alarmPrefix}DurationAlarm`, {
      metric: lambdaFn.metricDuration(),
      threshold: durationThresholdMs,
      evaluationPeriods,
      comparisonOperator: ComparisonOperator.GREATER_THAN_OR_EQUAL_TO_THRESHOLD,
      treatMissingData: TreatMissingData.NOT_BREACHING,
      alarmDescription: `${alarmPrefix} execution time exceeded ${durationThresholdMs}ms.`,
      alarmName: `${alarmPrefix}-Duration`,
    });

    // Throttle Alarm
    new Alarm(this, `${alarmPrefix}ThrottlesAlarm`, {
      metric: lambdaFn.metricThrottles(),
      threshold: 1,
      evaluationPeriods,
      comparisonOperator: ComparisonOperator.GREATER_THAN_OR_EQUAL_TO_THRESHOLD,
      treatMissingData: TreatMissingData.NOT_BREACHING,
      alarmDescription: `${alarmPrefix} is being throttled.`,
      alarmName: `${alarmPrefix}-Throttles`,
    });
  }
}
