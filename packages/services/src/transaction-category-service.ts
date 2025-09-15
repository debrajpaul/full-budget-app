import {
  ILogger,
  ETenantType,
  ITransactionStore,
  ITransactionCategoryService,
  ICategoryRulesStore,
  ITransactionCategoryRequest,
  EBaseCategories,
  IRuleEngine,
} from "@common";
import { keywordBaseCategoryMap } from "@nlp-tagger";

export class TransactionCategoryService implements ITransactionCategoryService {
  private readonly logger: ILogger;
  private readonly transactionStore: ITransactionStore;
  private readonly categoryRulesStore: ICategoryRulesStore;
  private readonly ruleEngine: IRuleEngine;

  constructor(
    logger: ILogger,
    transactionStore: ITransactionStore,
    categoryRulesStore: ICategoryRulesStore,
    ruleEngine: IRuleEngine,
  ) {
    this.logger = logger;
    this.transactionStore = transactionStore;
    this.categoryRulesStore = categoryRulesStore;
    this.ruleEngine = ruleEngine;
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
      if (category && category !== EBaseCategories.unclassified) {
        this.logger.info(
          `Skipping transaction ${transactionId} — already categorized`,
        );
        return false;
      }
      // step 1: Fetch rules for tenant
      const rules = await this.categoryRulesStore.getRulesByTenant(tenantId);

      // step 2: Match description against rules
      let matchedCategory = this.ruleEngine.categorize({ description, rules });
      let finalTaggedBy = taggedBy ?? "RULE_ENGINE";
      let finalConfidence: number | undefined = confidence ?? 1;
      // No AI fallback; rules are the single source of truth
      // step 4: Update transaction with matched category
      await this.transactionStore.updateTransactionCategory(
        tenantId,
        transactionId,
        matchedCategory.category,
        matchedCategory.subCategory,
        finalTaggedBy,
        finalConfidence,
        undefined,
      );
      this.logger.info(`Transaction ${transactionId} categorized`);
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
}
