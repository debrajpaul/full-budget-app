import { chunk } from "lodash";
import {
  ICategoryRules,
  ILogger,
  ICategoryRulesStore,
  ETenantType,
} from "@common";
import {
  PutCommand,
  QueryCommand,
  DeleteCommand,
  DynamoDBDocumentClient,
} from "@aws-sdk/lib-dynamodb";

export class CategoryRulesStore implements ICategoryRulesStore {
  private readonly logger: ILogger;
  private readonly tableName: string;
  private readonly store: DynamoDBDocumentClient;

  constructor(
    logger: ILogger,
    tableName: string,
    store: DynamoDBDocumentClient,
  ) {
    this.logger = logger;
    this.tableName = tableName;
    this.store = store;
  }

  public async getRulesByTenant(
    tenantId: ETenantType,
  ): Promise<Record<string, string>> {
    const rules: Record<string, string> = {};

    // Load tenant-specific rules
    const tenantRules: ICategoryRules[] = await this.loadRules(tenantId);

    tenantRules.forEach((tenantRule: ICategoryRules) => {
      rules[tenantRule.keyword.toLowerCase()] = tenantRule.category;
    });

    // Load global defaults (only if tenant doesn't override)
    const globalRules: ICategoryRules[] = await this.loadRules(
      ETenantType.default,
    );
    globalRules.forEach((item) => {
      const key = item.keyword.toLowerCase();
      if (!rules[key]) {
        rules[key] = item.category;
      }
    });
    return rules;
  }

  public async addRules(
    tenantId: ETenantType,
    rules: Record<string, string>,
  ): Promise<void> {
    this.logger.info("Saving rules to DynamoDB");
    this.logger.debug("Rules", { rules });

    const chunks = chunk(Object.entries(rules), 25);
    for (const chunk of chunks) {
      const promises = chunk.map(([keyword, category]) =>
        this.addRule(tenantId, keyword, category),
      );
      await Promise.all(promises);
    }
  }

  public async addRule(
    tenantId: ETenantType,
    keyword: string,
    category: string,
  ): Promise<void> {
    this.logger.info("Saving rule to DynamoDB");
    this.logger.debug("Rule", { tenantId, keyword, category });
    const item: ICategoryRules = {
      ruleId: `${tenantId}#${keyword.toLowerCase()}`,
      tenantId,
      keyword: keyword.toLowerCase(),
      category,
      isActive: true,
      createdAt: new Date().toISOString(),
    };

    const command = new PutCommand({
      TableName: this.tableName,
      Item: item,
      ConditionExpression: "attribute_not_exists(ruleId)",
    });
    await this.store.send(command);
  }

  public removeRule(tenantId: ETenantType, ruleId: string): void {
    this.logger.info("Removing rule from DynamoDB");
    this.logger.debug("Rule", { tenantId, ruleId });
    const command = new DeleteCommand({
      TableName: this.tableName,
      Key: {
        tenantId,
        ruleId,
      },
    });
    this.store.send(command);
    this.logger.info("Rule removed successfully", { tenantId, ruleId });
  }

  private async loadRules(tenantId: ETenantType): Promise<ICategoryRules[]> {
    const command = new QueryCommand({
      TableName: this.tableName,
      KeyConditionExpression: "tenantId = :tid",
      ExpressionAttributeValues: { ":tid": tenantId },
      ProjectionExpression: "keyword, category",
    });
    const result = await this.store.send(command);
    return (result.Items as ICategoryRules[]) || [];
  }
}
