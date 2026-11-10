import { Construct } from "constructs";

export const STAGES = ["qa", "prod"] as const;
export type Stage = (typeof STAGES)[number];

export interface StageConfig {
  stage: Stage;
  region: string;
  logLevel: string;
  aiTaggingEnabled: boolean;
  bedrockModelId: string;
  terminationProtection: boolean;
  jwtParameterName: string;
}

const STAGE_SETTINGS: Record<Stage, Omit<StageConfig, "stage">> = {
  qa: {
    region: "ap-south-1",
    logLevel: "info",
    aiTaggingEnabled: false,
    bedrockModelId: "mistral.mistral-7b-instruct-v0:2",
    terminationProtection: false,
    jwtParameterName: "/full-budget-app/qa/jwt-secret",
  },
  prod: {
    region: "ap-south-1",
    logLevel: "info",
    aiTaggingEnabled: false,
    bedrockModelId: "mistral.mistral-7b-instruct-v0:2",
    terminationProtection: true,
    jwtParameterName: "/full-budget-app/prod/jwt-secret",
  },
};

// No default stage on purpose: a bare `cdk deploy` must never reach prod.
export function resolveStage(scope: Construct): StageConfig {
  const value = scope.node.tryGetContext("stage");
  if (typeof value !== "string" || !STAGES.includes(value as Stage)) {
    throw new Error(
      `Missing or invalid CDK context "stage" (got ${JSON.stringify(value)}). Pass -c stage=qa or -c stage=prod.`
    );
  }
  const stage = value as Stage;
  return { stage, ...STAGE_SETTINGS[stage] };
}
