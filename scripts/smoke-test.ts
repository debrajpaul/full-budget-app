// Post-deploy smoke test. Reads the API URL from the CDK outputs file written by
// `cdk deploy --outputs-file`, then calls the healthCheck query.
//
// Usage: ts-node scripts/smoke-test.ts --stage qa --outputs cdk-outputs.json

import { readFileSync } from "fs";

const STAGES = ["qa", "prod"] as const;
type Stage = (typeof STAGES)[number];

function getArg(name: string): string | undefined {
  const index = process.argv.indexOf(name);
  return index === -1 ? undefined : process.argv[index + 1];
}

function parseStage(value: string | undefined): Stage {
  if (!value || !STAGES.includes(value as Stage)) {
    throw new Error(`--stage must be one of: ${STAGES.join(", ")}`);
  }
  return value as Stage;
}

function readApiUrl(outputsPath: string, stage: Stage): string {
  const outputs = JSON.parse(readFileSync(outputsPath, "utf8")) as Record<
    string,
    Record<string, string>
  >;
  const stackOutputs = outputs[`fba-${stage}-GraphQLApiStack`];
  const url = stackOutputs?.GraphQLApiUrl;
  if (!url) {
    throw new Error(
      `GraphQLApiUrl not found for stage ${stage} in ${outputsPath}`
    );
  }
  return url;
}

async function healthCheck(url: string): Promise<string> {
  const response = await fetch(url, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ query: "{ healthCheck }" }),
  });
  if (!response.ok) {
    throw new Error(`HTTP ${response.status} from ${url}`);
  }
  const body = (await response.json()) as {
    data?: { healthCheck?: string };
    errors?: { message: string }[];
  };
  if (body.errors?.length) {
    throw new Error(
      `GraphQL errors: ${body.errors.map((e) => e.message).join("; ")}`
    );
  }
  return body.data?.healthCheck ?? "";
}

async function main(): Promise<void> {
  const stage = parseStage(getArg("--stage"));
  const outputsPath = getArg("--outputs") ?? "cdk-outputs.json";
  const url = readApiUrl(outputsPath, stage);

  const result = await healthCheck(url);
  if (result !== "API is healthy") {
    throw new Error(`Unexpected healthCheck result: ${JSON.stringify(result)}`);
  }
  console.log(`✓ ${stage}: ${url} is healthy`);
}

main().catch((error: unknown) => {
  console.error(`✗ smoke test failed: ${(error as Error).message}`);
  process.exit(1);
});
