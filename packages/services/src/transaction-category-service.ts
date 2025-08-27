import {
  ILogger,
  ETenantType,
  INlpService,
  ITransactionStore,
  ITransactionCategoryService,
  ICategoryRulesStore,
  ITransactionCategoryRequest,
} from "@common";
import { keywordCategoryMap } from "@nlp-tagger";

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
      if (category && category.trim() !== "") {
        this.logger.info(
          `Skipping transaction ${transactionId} — already categorized`,
        );
        return false;
      }
      // step 1: Fetch rules for tenant
      const rules = await this.categoryRulesStore.getRulesByTenant(tenantId);

      // step 2: Match description against rules
      let matchedCategory = this.categorizeByRules(description, rules);
      let finalTaggedBy = taggedBy ?? "RULE_ENGINE";
      let finalConfidence: number | undefined = confidence ?? 1;
      let finalEmbedding = embedding;
      // step 3: Fallback to AI tagging
      if (!matchedCategory && !this.aiTaggingEnabled) {
        this.logger.info(
          `AI tagging disabled for transaction ${transactionId}, skipping classification`,
        );
        matchedCategory = "TEST_TAGGED_CATEGORY";
        finalTaggedBy = taggedBy ?? "DEFAULT_ENGINE";
        finalConfidence = undefined;
      } else if (!matchedCategory) {
        this.logger.info(
          `No rule matched for transaction ${transactionId}, falling back to AI tagging`,
        );
        const analysis = await this.nlpService.analyzeDescription(description);
        this.logger.debug("AI tagging result analysis:", { analysis });

        const classification = await this.classifyDescription(description);
        this.logger.debug("AI tagging result classification:", {
          classification,
        });
        if (classification) {
          matchedCategory = classification.category;
          finalTaggedBy = "AI_TAGGER";
          finalConfidence = classification.confidence;
        } else {
          matchedCategory = "AI_TAGGED_CATEGORY";
          finalTaggedBy = "AI_TAGGER";
          finalConfidence = undefined;
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
    return await this.categoryRulesStore.addRules(tenantId, keywordCategoryMap);
  }

  private categorizeByRules(
    description: string,
    rules: Record<string, string>,
  ): string | null {
    let matchedCategory = null;
    const normalizedDescription = description.toLowerCase();
    for (const keyword in rules) {
      if (normalizedDescription.includes(keyword)) {
        matchedCategory = rules[keyword];
        this.logger.info(`Matched category "${matchedCategory}"`);
        break;
      }
    }
    return matchedCategory;
  }

  public async classifyDescription(
    description: string,
  ): Promise<{ category: string; confidence?: number } | null> {
    if (!this.nlpService) return null;
    const classes = await this.nlpService.classifyDescription(description);
    const topClass = classes && classes[0];
    if (!topClass?.Name) return null;
    return { category: topClass.Name, confidence: topClass.Score };
  }
}
