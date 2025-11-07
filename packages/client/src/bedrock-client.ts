import {
  ILogger,
  IBedrockClient,
  IBedrockClientConfig,
  IPromptInput,
  EBaseCategories,
  ESubSavingCategories,
  ESubExpenseCategories,
  ESubIncomeCategories,
  ESubInvestmentCategories,
  ESubLoanCategories,
} from "@common";
import {
  BedrockRuntimeClient,
  InvokeModelCommand,
} from "@aws-sdk/client-bedrock-runtime";

export class BedrockClient implements IBedrockClient {
  constructor(
    private readonly logger: ILogger,
    private readonly bedrock: BedrockRuntimeClient,
    private readonly bedrockClientConfig: IBedrockClientConfig,
  ) {
    this.logger.info("BedrockClient initialized");
    this.logger.info("BedrockClient config", { bedrockClientConfig });
  }

  private buildPrompt(description: string): string {
    const prompt = `
        You are a bank transaction classifier. Given a description, output a JSON with keys "base", "sub", "reason" and "reason".
        category: ${Object.values(EBaseCategories)
          .filter((value) => typeof value === "string")
          .join(", ")}        
        subCategory: ${Object.values(ESubSavingCategories)
          .filter((value) => typeof value === "string")
          .join(", ")}
        ${Object.values(ESubExpenseCategories)
          .filter((value) => typeof value === "string")
          .join(", ")}
        ${Object.values(ESubIncomeCategories)
          .filter((value) => typeof value === "string")
          .join(", ")}
        ${Object.values(ESubInvestmentCategories)
          .filter((value) => typeof value === "string")
          .join(", ")}
        ${Object.values(ESubLoanCategories)
          .filter((value) => typeof value === "string")
          .join(", ")} and
        Only choose "sub" if the base category is EXPENSE, INCOME, INVESTMENT or LOAN.  Otherwise leave "sub" empty.
        Description: ${description}
      `;

    return prompt;
  }

  private buildInput(prompt: string): IPromptInput {
    const input = { prompt, maxTokens: 150 };
    return input;
  }

  private buildCommand(input: IPromptInput): InvokeModelCommand {
    const command = new InvokeModelCommand({
      body: JSON.stringify(input),
      contentType: "application/json",
      accept: "application/json",
      modelId: this.bedrockClientConfig.modelId,
    });

    return command;
  }

  async invokeModel(description: string): Promise<any> {
    this.logger.info(`Invoking model with description: ${description}`);
    const prompt = this.buildPrompt(description);
    this.logger.info(`Prompt: ${prompt}`);
    const input = this.buildInput(prompt);
    this.logger.info(`Input: ${JSON.stringify(input)}`);
    const command = this.buildCommand(input);
    this.logger.info(`Command: ${JSON.stringify(command)}`);
    return await this.bedrock.send(command);
  }
}
