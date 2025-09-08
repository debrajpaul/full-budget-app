import { chunk } from "lodash";
import {
  ICategoryRules,
  ILogger,
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
  ): Promise<Record<string, EBaseCategories>> {
    const rules: Record<string, EBaseCategories> = {};

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

  public async listCategoriesByBase(
    tenantId: ETenantType,
  ): Promise<Record<EBaseCategories, string[]>> {
    const grouped: Record<EBaseCategories, Set<string>> = {
      [EBaseCategories.savings]: new Set<string>(),
      [EBaseCategories.expenses]: new Set<string>(),
      [EBaseCategories.income]: new Set<string>(),
      [EBaseCategories.default]: new Set<string>(),
    };

    // Load tenant-specific rules
    const tenantRules: ICategoryRules[] = await this.loadRules(tenantId);
    tenantRules.forEach((r) => grouped[r.category]?.add(r.keyword));

    // Load global defaults and only add if not already present
    const globalRules: ICategoryRules[] = await this.loadRules(
      ETenantType.default,
    );
    globalRules.forEach((r) => {
      if (!grouped[r.category]?.has(r.keyword)) {
        grouped[r.category]?.add(r.keyword);
      }
    });

    return Object.fromEntries(
      Object.entries(grouped).map(([k, set]) => [k, Array.from(set).sort()]),
    ) as Record<EBaseCategories, string[]>;
  }

  public async addRules(
    tenantId: ETenantType,
    rules: Record<string, EBaseCategories>,
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
    category: EBaseCategories,
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
      case EBaseCategories.default:
        return { category: EBaseCategories.default };
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

    // Fallback: nothing recognized -> DEFAULT
    return { category: EBaseCategories.default };
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
        return EBaseCategories.default;
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