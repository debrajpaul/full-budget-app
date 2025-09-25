import { chunk } from "lodash";
import {
  ILogger,
  ICategoryRules,
  ICategoryRulesStore,
  ETenantType,
  EBaseCategories,
  ESubExpenseCategories,
  ESubSavingCategories,
  ESubIncomeCategories,
  ESubInvestmentCategories,
  ESubLoanCategories,
  EAllSubCategories,
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
  ): Promise<ICategoryRules[]> {
    // Load tenant-specific rules
    const tenantRules: ICategoryRules[] = await this.loadRules(tenantId);

    // Load global defaults (only if tenant doesn't override)
    const globalRules: ICategoryRules[] = await this.loadRules(
      ETenantType.default,
    );

    return [...tenantRules, ...globalRules];
  }

  public async listCategoriesByBase(
    tenantId: ETenantType,
  ): Promise<Record<EBaseCategories, string[]>> {
    const grouped: Record<EBaseCategories, Set<string>> = {
      [EBaseCategories.savings]: new Set<string>(),
      [EBaseCategories.expenses]: new Set<string>(),
      [EBaseCategories.income]: new Set<string>(),
      [EBaseCategories.investment]: new Set<string>(),
      [EBaseCategories.loan]: new Set<string>(),
      [EBaseCategories.transfer]: new Set<string>(),
      [EBaseCategories.unclassified]: new Set<string>(),
    };

    // Load tenant-specific rules
    const tenantRules: ICategoryRules[] = await this.loadRules(tenantId);
    tenantRules.forEach((r) => grouped[r.category]?.add(String(r.match)));

    // Load global defaults and only add if not already present
    const globalRules: ICategoryRules[] = await this.loadRules(
      ETenantType.default,
    );
    globalRules.forEach((r) => {
      if (!grouped[r.category]?.has(String(r.match))) {
        grouped[r.category]?.add(String(r.match));
      }
    });

    return Object.fromEntries(
      Object.entries(grouped).map(([k, set]) => [k, Array.from(set).sort()]),
    ) as Record<EBaseCategories, string[]>;
  }

  public async addRules(
    tenantId: ETenantType,
    rules: Omit<ICategoryRules, "tenantId" | "ruleId" | "createdAt">[],
  ): Promise<void> {
    this.logger.info("Saving rules to DynamoDB");
    this.logger.debug("Rules", { rules });

    const chunks = chunk(rules, 25);
    for (const chunk of chunks) {
      const promises = chunk.map(
        (rule: Omit<ICategoryRules, "tenantId" | "ruleId" | "createdAt">) =>
          this.addRule(tenantId, rule),
      );
      await Promise.all(promises);
    }
  }

  public async addRule(
    tenantId: ETenantType,
    rule: Omit<ICategoryRules, "tenantId" | "ruleId" | "createdAt">,
  ): Promise<void> {
    this.logger.info("Saving rule to DynamoDB");
    const { match, category, taggedBy, subCategory, reason, confidence, when } =
      rule;
    this.logger.debug("Rule", {
      tenantId,
      match,
      category,
      subCategory,
      taggedBy,
      reason,
      confidence,
    });
    // Persist regex as pattern + flags to avoid marshalling class instances
    const pattern = match.source;
    const flags = match.flags;
    const normalizedWhen = when ?? "ANY";
    const baseRuleId = `${tenantId}#/${pattern}/${flags}`;
    const ruleId = `${baseRuleId}#${normalizedWhen}`;

    const item = {
      ruleId,
      tenantId,
      pattern,
      flags,
      category,
      subCategory,
      taggedBy,
      reason,
      confidence,
      when: normalizedWhen,
      createdAt: new Date().toISOString(),
    } as const;

    if (ruleId !== baseRuleId) {
      await this.store.send(
        new DeleteCommand({
          TableName: this.tableName,
          Key: {
            tenantId,
            ruleId: baseRuleId,
          },
        }),
      );
    }

    const command = new PutCommand({
      TableName: this.tableName,
      Item: item,
      ConditionExpression: "attribute_not_exists(ruleId) OR #when = :when",
      ExpressionAttributeNames: {
        "#when": "when",
      },
      ExpressionAttributeValues: {
        ":when": normalizedWhen,
      },
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

  /**
   * Maps a classification label from the NLP model to the corresponding category and sub-category enums.
   * @param label - The classification label from the NLP model
   * @returns An object containing the category and optional sub-category
   */
  public mapClassificationToEnums(label: string): {
    category: EBaseCategories;
    subCategory?: EAllSubCategories;
  } {
    const normalized = this.normalizeSubCategoryLabel(label);

    // First, if the model directly outputs a base category
    switch (normalized) {
      case EBaseCategories.income:
        return { category: EBaseCategories.income };
      case EBaseCategories.expenses:
        return { category: EBaseCategories.expenses };
      case EBaseCategories.savings:
        return { category: EBaseCategories.savings };
      case EBaseCategories.investment:
        return { category: EBaseCategories.investment };
      case EBaseCategories.loan:
        return { category: EBaseCategories.loan };
      case EBaseCategories.transfer:
        return { category: EBaseCategories.transfer };
      case EBaseCategories.unclassified:
        return { category: EBaseCategories.unclassified };
    }

    // Use an explicit lookup across all sub-category enums
    const subCategoryLookup: Record<string, EAllSubCategories> = {
      // Expense sub-categories
      [ESubExpenseCategories.housing]: ESubExpenseCategories.housing,
      [ESubExpenseCategories.transportation]:
        ESubExpenseCategories.transportation,
      [ESubExpenseCategories.food]: ESubExpenseCategories.food,
      [ESubExpenseCategories.utilities]: ESubExpenseCategories.utilities,
      [ESubExpenseCategories.healthcare]: ESubExpenseCategories.healthcare,

      // Savings sub-categories
      [ESubSavingCategories.retirement]: ESubSavingCategories.retirement,
      [ESubSavingCategories.emergency]: ESubSavingCategories.emergency,
      [ESubSavingCategories.education]: ESubSavingCategories.education,
      [ESubSavingCategories.travel]: ESubSavingCategories.travel,
      [ESubSavingCategories.health]: ESubSavingCategories.health,

      // Income sub-categories
      [ESubIncomeCategories.salary]: ESubIncomeCategories.salary,
      [ESubIncomeCategories.business]: ESubIncomeCategories.business,
      [ESubIncomeCategories.investment]: ESubIncomeCategories.investment,
      [ESubIncomeCategories.freelance]: ESubIncomeCategories.freelance,

      // Investment sub-categories
      [ESubInvestmentCategories.stocks]: ESubInvestmentCategories.stocks,
      [ESubInvestmentCategories.bonds]: ESubInvestmentCategories.bonds,
      [ESubInvestmentCategories.realEstate]:
        ESubInvestmentCategories.realEstate,
      [ESubInvestmentCategories.mutualFunds]:
        ESubInvestmentCategories.mutualFunds,

      // Loan sub-categories
      [ESubLoanCategories.personal]: ESubLoanCategories.personal,
      [ESubLoanCategories.mortgage]: ESubLoanCategories.mortgage,
      [ESubLoanCategories.auto]: ESubLoanCategories.auto,
      [ESubLoanCategories.student]: ESubLoanCategories.student,
    } as const;

    // Add common synonyms for variants that the model might emit
    const synonyms: Record<string, EAllSubCategories> = {
      REAL_ESTATE: ESubInvestmentCategories.realEstate,
      "REAL-ESTATE": ESubInvestmentCategories.realEstate,
      "REAL ESTATE": ESubInvestmentCategories.realEstate,
      MUTUAL_FUNDS: ESubInvestmentCategories.mutualFunds,
      "MUTUAL-FUNDS": ESubInvestmentCategories.mutualFunds,
      "MUTUAL FUNDS": ESubInvestmentCategories.mutualFunds,
    };

    const directMatch =
      subCategoryLookup[normalized as keyof typeof subCategoryLookup];
    const synonymMatch = synonyms[normalized as keyof typeof synonyms];
    const subCategory = directMatch || synonymMatch;

    if (subCategory) {
      return {
        category: this.baseCategoryForSubCategory(subCategory),
        subCategory,
      };
    }

    // Fallback: nothing recognized -> unclassified
    return { category: EBaseCategories.unclassified };
  }

  private async loadRules(tenantId: ETenantType): Promise<ICategoryRules[]> {
    const command = new QueryCommand({
      TableName: this.tableName,
      KeyConditionExpression: "tenantId = :tid",
      ExpressionAttributeValues: { ":tid": tenantId },
      ProjectionExpression:
        "ruleId, tenantId, pattern, flags, category, subCategory, taggedBy, reason, confidence, createdAt, #when",
      ExpressionAttributeNames: {
        "#when": "when",
      },
    });
    const result = await this.store.send(command);
    const items =
      (result.Items as Array<{
        ruleId: string;
        tenantId: ETenantType;
        pattern?: string;
        flags?: string;
        category: EBaseCategories;
        subCategory?: EAllSubCategories;
        taggedBy?: string;
        reason?: string;
        confidence?: number;
        createdAt: string;
        when?: ICategoryRules["when"];
      }>) || [];

    return items.map((it) => {
      let pattern = it.pattern;
      let flags = it.flags ?? "";
      const rawMatch = (it as unknown as { match?: string }).match;
      if (!pattern && rawMatch && typeof rawMatch === "string") {
        // Fallback for legacy rows stored as "/pattern/flags"
        const lastSlash = rawMatch.lastIndexOf("/");
        if (rawMatch.startsWith("/") && lastSlash > 0) {
          pattern = rawMatch.slice(1, lastSlash);
          flags = rawMatch.slice(lastSlash + 1);
        } else {
          // Treat as a simple substring match if not a regex literal
          pattern = rawMatch.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
          flags = "i";
        }
      }
      return {
        ruleId: it.ruleId,
        tenantId: it.tenantId,
        match: new RegExp(pattern ?? "", flags),
        category: it.category,
        subCategory: it.subCategory,
        taggedBy: it.taggedBy ?? "RULE_ENGINE",
        reason: it.reason,
        confidence: it.confidence,
        when: it.when,
        createdAt: it.createdAt,
      } as ICategoryRules;
    });
  }

  /**
   * Maps a sub-category to its corresponding base category.
   * @param subCategory - The sub-category to map
   * @returns The corresponding base category
   */
  private baseCategoryForSubCategory(
    subCategory: EAllSubCategories,
  ): EBaseCategories {
    switch (subCategory) {
      // Expenses
      case ESubExpenseCategories.housing:
      case ESubExpenseCategories.transportation:
      case ESubExpenseCategories.food:
      case ESubExpenseCategories.utilities:
      case ESubExpenseCategories.healthcare:
        return EBaseCategories.expenses;

      // Savings
      case ESubSavingCategories.retirement:
      case ESubSavingCategories.emergency:
      case ESubSavingCategories.education:
      case ESubSavingCategories.travel:
      case ESubSavingCategories.health:
        return EBaseCategories.savings;

      // Income
      case ESubIncomeCategories.salary:
      case ESubIncomeCategories.business:
      case ESubIncomeCategories.investment:
      case ESubIncomeCategories.freelance:
        return EBaseCategories.income;

      // Investment
      case ESubInvestmentCategories.stocks:
      case ESubInvestmentCategories.bonds:
      case ESubInvestmentCategories.realEstate:
      case ESubInvestmentCategories.mutualFunds:
        return EBaseCategories.savings; // Treat investments under savings umbrella

      // Loans
      case ESubLoanCategories.personal:
      case ESubLoanCategories.mortgage:
      case ESubLoanCategories.auto:
      case ESubLoanCategories.student:
        return EBaseCategories.expenses; // Loan payments are expenses by default

      default:
        return EBaseCategories.unclassified;
    }
  }

  /**
   * Normalize a label by trimming, uppercasing, and replacing spaces with underscores
   * @param label - The label to normalize
   * @returns The normalized label
   */
  private normalizeSubCategoryLabel(label: string): string {
    return label.trim().toUpperCase().replace(/\s+/g, "_");
  }
}
