import {
  ILogger,
  ETenantType,
  INlpService,
  ITransactionStore,
  ITransactionCategoryService,
  ICategoryRulesStore,
  ITransactionCategoryRequest,
  EBaseCategories,
} from "@common";
import { keywordBaseCategoryMap, categorizeByRules } from "@nlp-tagger";
import {
  ESubExpenseCategories,
  ESubIncomeCategories,
  ESubInvestmentCategories,
  ESubLoanCategories,
  ESubSavingCategories,
} from "@common";

export class TransactionCategoryService implements ITransactionCategoryService {
  private readonly logger: ILogger;
  private readonly transactionStore: ITransactionStore;
  private readonly categoryRulesStore: ICategoryRulesStore;
  private readonly nlpService: INlpService;
  private readonly aiTaggingEnabled: boolean;

  constructor(
    logger: ILogger,
    transactionStore: ITransactionStore,
    categoryRulesStore: ICategoryRulesStore,
    nlpService: INlpService,
    aiTaggingEnabled?: boolean,
  ) {
    this.logger = logger;
    this.transactionStore = transactionStore;
    this.categoryRulesStore = categoryRulesStore;
    this.nlpService = nlpService;
    this.aiTaggingEnabled = aiTaggingEnabled ?? false;
    this.logger.info("ProcessService initialized");
  }
  public async process(request: ITransactionCategoryRequest): Promise<boolean> {
    this.logger.info("process started processing messages");
    try {
      const {
        tenantId,
        transactionId,
        description,
        category,
        embedding,
        taggedBy,
        confidence,
      } = request;

      if (!tenantId || !transactionId || !description) {
        this.logger.warn("Skipping record with missing required fields", {
          tenantId,
          transactionId,
        });
        return false;
      }
      // Skip if category already set
      if (category && category !== EBaseCategories.default) {
        this.logger.info(
          `Skipping transaction ${transactionId} — already categorized`,
        );
        return false;
      }
      // step 1: Fetch rules for tenant
      const rules = await this.categoryRulesStore.getRulesByTenant(tenantId);

      // step 2: Match description against rules
      let matchedCategory = categorizeByRules(description, rules);
      let finalTaggedBy = taggedBy ?? "RULE_ENGINE";
      let finalConfidence: number | undefined = confidence ?? 1;
      let finalEmbedding = embedding;

      // step 3: Fallback to AI tagging only if no rule matched and AI enabled
      const ruleMatched = matchedCategory !== EBaseCategories.default;
      if (!ruleMatched && this.aiTaggingEnabled) {
        this.logger.info(
          `No rule matched for transaction ${transactionId}, falling back to AI tagging`,
        );
        const analysis = await this.nlpService.analyzeDescription(description);
        this.logger.debug("AI tagging result analysis:", { analysis });

        const classification = await this.classification(description);
        this.logger.debug("AI tagging result classification:", {
          classification,
        });
        if (classification) {
          matchedCategory = classification.category as EBaseCategories;
          finalTaggedBy = "AI_TAGGER";
          finalConfidence = classification.confidence;
        }
        finalEmbedding = embedding;
      }
      // step 4: Update transaction with matched category
      await this.transactionStore.updateTransactionCategory(
        tenantId,
        transactionId,
        matchedCategory,
        finalTaggedBy,
        finalConfidence,
        finalEmbedding,
      );
      this.logger.info(
        `Transaction ${transactionId} categorized as "${matchedCategory}"`,
      );
      return true;
    } catch (err) {
      this.logger.error("Error processing message", err as Error);
      return false;
    }
  }

  public async addRulesByTenant(
    tenantId: ETenantType = ETenantType.default,
  ): Promise<void> {
    this.logger.info(`Adding rules for tenant ${tenantId}`);
    return await this.categoryRulesStore.addRules(
      tenantId,
      keywordBaseCategoryMap,
    );
  }

  public async classification(description: string): Promise<{
    category: EBaseCategories;
    subCategory?: string;
    confidence?: number;
  } | null> {
    if (!this.nlpService) return { category: EBaseCategories.default };
    const classes = await this.nlpService.classifyDescription(description);
    const topClass = classes && classes[0];
    if (!topClass?.Name)
      return {
        category: EBaseCategories.default,
      };

    // Try store mapping first, then gracefully fallback
    let category: EBaseCategories | undefined;
    let subCategory: string | undefined;
    try {
      const mapped = this.categoryRulesStore.mapClassificationToEnums(
        topClass.Name,
      );
      category = mapped?.category;
      // mapped.subCategory may be an enum; keep as string for simplicity here
      subCategory = (mapped as unknown as { subCategory?: string })
        ?.subCategory;
    } catch (e) {
      // ignore and use fallback
      this.logger.debug(
        "Error in categoryRulesStore mapClassificationToEnums",
        { e },
      );
    }

    if (!category) {
      const fallback = this.fallbackMapClassificationToEnums(topClass.Name);
      category = fallback.category;
      subCategory = fallback.subCategory;
    }

    return {
      category,
      subCategory,
      confidence: topClass.Score,
    };
  }

  public async getCategoriesByTenant(
    tenantId: ETenantType,
  ): Promise<Record<string, string[]>> {
    const grouped =
      await this.categoryRulesStore.listCategoriesByBase(tenantId);
    // Return as Record<string, string[]> to keep GraphQL layer simple
    return Object.fromEntries(
      Object.entries(grouped).map(([k, v]) => [k, v as string[]]),
    );
  }

  // Local fallback mapper to keep service resilient when store mapping isn't available (e.g., in tests)
  private fallbackMapClassificationToEnums(label: string): {
    category: EBaseCategories;
    subCategory?: string;
  } {
    const normalized = label.trim().toUpperCase().replace(/\s+/g, "_");

    // Direct base category names
    if (normalized === EBaseCategories.income)
      return { category: EBaseCategories.income };
    if (normalized === EBaseCategories.expenses)
      return { category: EBaseCategories.expenses };
    if (normalized === EBaseCategories.savings)
      return { category: EBaseCategories.savings };
    if (normalized === EBaseCategories.default)
      return { category: EBaseCategories.default };

    // Sub-category to base mapping
    const isExpense = new Set<string>(Object.values(ESubExpenseCategories));
    const isSaving = new Set<string>(Object.values(ESubSavingCategories));
    const isIncome = new Set<string>(Object.values(ESubIncomeCategories));
    const isInvestment = new Set<string>(
      Object.values(ESubInvestmentCategories),
    );
    const isLoan = new Set<string>(Object.values(ESubLoanCategories));

    if (isExpense.has(normalized))
      return { category: EBaseCategories.expenses, subCategory: normalized };
    if (isSaving.has(normalized))
      return { category: EBaseCategories.savings, subCategory: normalized };
    if (isIncome.has(normalized))
      return { category: EBaseCategories.income, subCategory: normalized };
    if (isInvestment.has(normalized))
      return { category: EBaseCategories.savings, subCategory: normalized };
    if (isLoan.has(normalized))
      return { category: EBaseCategories.expenses, subCategory: normalized };

    // Simple synonyms that models often emit
    const synonyms: Record<
      string,
      { category: EBaseCategories; subCategory?: string }
    > = {
      REAL_ESTATE: {
        category: EBaseCategories.savings,
        subCategory: ESubInvestmentCategories.realEstate,
      },
      "REAL-ESTATE": {
        category: EBaseCategories.savings,
        subCategory: ESubInvestmentCategories.realEstate,
      },
      "REAL ESTATE": {
        category: EBaseCategories.savings,
        subCategory: ESubInvestmentCategories.realEstate,
      },
      MUTUAL_FUNDS: {
        category: EBaseCategories.savings,
        subCategory: ESubInvestmentCategories.mutualFunds,
      },
      "MUTUAL-FUNDS": {
        category: EBaseCategories.savings,
        subCategory: ESubInvestmentCategories.mutualFunds,
      },
      "MUTUAL FUNDS": {
        category: EBaseCategories.savings,
        subCategory: ESubInvestmentCategories.mutualFunds,
      },
    };
    if (synonyms[normalized]) return synonyms[normalized];

    return { category: EBaseCategories.default };
  }
}
