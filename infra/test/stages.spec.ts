import { App, Stack } from "aws-cdk-lib";
import { Template } from "aws-cdk-lib/assertions";
import { createApp } from "../lib/app";
import { STAGES, Stage } from "../lib/stage-config";

// Requires `pnpm build` first: the Lambda constructs read apps/*/dist.
function synthStacks(stage: Stage): Stack[] {
  const app = new App({ context: { stage } });
  createApp(app);
  return app.node.findAll().filter((c): c is Stack => c instanceof Stack);
}

function tableNames(stacks: Stack[]): string[] {
  return stacks.flatMap((stack) =>
    Object.values(
      Template.fromStack(stack).findResources("AWS::DynamoDB::Table")
    ).map((table) => table.Properties.TableName as string)
  );
}

describe("createApp", () => {
  it("refuses to synth without a stage", () => {
    expect(() => createApp(new App())).toThrow(/context "stage"/);
  });

  it("refuses an unknown stage", () => {
    expect(() => createApp(new App({ context: { stage: "prod-2" } }))).toThrow(
      /context "stage"/
    );
  });

  describe.each(STAGES)("stage %s", (stage) => {
    it("prefixes every stack name with the stage", () => {
      const stacks = synthStacks(stage);
      expect(stacks.length).toBeGreaterThan(0);
      for (const stack of stacks) {
        expect(stack.stackName).toMatch(new RegExp(`^fba-${stage}-`));
      }
    });

    it("suffixes table names with the stage", () => {
      const names = tableNames(synthStacks(stage));
      expect(names.length).toBeGreaterThan(0);
      for (const name of names) {
        expect(name).toMatch(new RegExp(`-${stage}$`));
      }
    });

    it("runs the GraphQL Lambda on nodejs24.x", () => {
      const api = synthStacks(stage).find((s) => s.stackName === `fba-${stage}-GraphQLApiStack`);
      expect(api).toBeDefined();
      Template.fromStack(api!).hasResourceProperties("AWS::Lambda::Function", {
        Runtime: "nodejs24.x",
      });
    });

    it("sets the API Gateway stage to the stage name", () => {
      const api = synthStacks(stage).find((s) => s.stackName === `fba-${stage}-GraphQLApiStack`);
      Template.fromStack(api!).hasResourceProperties("AWS::ApiGateway::Stage", {
        StageName: stage,
      });
    });
  });

  it("enables termination protection on prod only", () => {
    expect(synthStacks("prod").every((s) => s.terminationProtection)).toBe(true);
    expect(synthStacks("qa").some((s) => s.terminationProtection)).toBe(false);
  });

  it("never shares a table name between qa and prod", () => {
    const qa = new Set(tableNames(synthStacks("qa")));
    const prod = tableNames(synthStacks("prod"));
    expect(prod.filter((name) => qa.has(name))).toEqual([]);
  });
});
