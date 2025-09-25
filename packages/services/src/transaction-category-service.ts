import {
  ILogger,
  ETenantType,
  ITransactionStore,
  ITransactionCategoryService,
  ICategoryRulesStore,
  ITransactionCategoryRequest,
  EBaseCategories,
  EAllSubCategories,
  IRuleEngine,
  IBedrockClassifierService,
} from "@common";
import { keywordBaseCategoryMap } from "@nlp-tagger";

export class TransactionCategoryService implements ITransactionCategoryService {
  private readonly logger: ILogger;
  private readonly transactionStore: ITransactionStore;
  private readonly categoryRulesStore: ICategoryRulesStore;
  private readonly ruleEngine: IRuleEngine;
  private readonly bedrockClassifierService: IBedrockClassifierService;
  private readonly aiTaggingEnabled: boolean;

  constructor(
    logger: ILogger,
    transactionStore: ITransactionStore,
    categoryRulesStore: ICategoryRulesStore,
    ruleEngine: IRuleEngine,
    bedrockClassifierService: IBedrockClassifierService,
    aiTaggingEnabled: boolean,
  ) {
    this.logger = logger;
    this.transactionStore = transactionStore;
    this.categoryRulesStore = categoryRulesStore;
    this.ruleEngine = ruleEngine;
    this.bedrockClassifierService = bedrockClassifierService;
    this.aiTaggingEnabled = aiTaggingEnabled;
    this.logger.info("ProcessService initialized");
  }
  public async process(request: ITransactionCategoryRequest): Promise<boolean> {
    this.logger.info("process started processing messages");
    try {
      const { tenantId, transactionId, description, category, amount } =
        request;

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
      let matchedCategory = this.ruleEngine.categorize({
        description,
        rules,
        amount,
      });

      // Fallback to Bedrock if still unclassified
      if (
        matchedCategory.category === EBaseCategories.unclassified &&
        this.aiTaggingEnabled
      ) {
        this.logger.info(
          `Rules returned UNCLASSIFIED for ${transactionId}; invoking Bedrock`,
        );
        const aiResult =
          await this.bedrockClassifierService.classifyWithBedrock(description);
        if (aiResult) {
          this.logger.info(
            "AI fallback result",
            Object.assign(
              {
                transactionId,
                aiBase: aiResult.base,
                aiSub: aiResult.sub,
                aiConfidence: aiResult.confidence,
              },
              aiResult.reason ? { aiReason: aiResult.reason } : {},
            ),
          );
          matchedCategory = {
            taggedBy: "BEDROCK",
            category: aiResult.base as EBaseCategories,
            subCategory: (aiResult.sub as EAllSubCategories) ?? undefined,
            reason: aiResult.reason ?? "AI fallback",
            confidence: aiResult.confidence ?? 0.7,
          };
        } else {
          this.logger.debug(`No AI result for ${transactionId}`);
        }
      }
      // step 4: Update transaction with matched category
      await this.transactionStore.updateTransactionCategory(
        tenantId,
        transactionId,
        matchedCategory.category,
        matchedCategory.subCategory,
        matchedCategory.taggedBy,
        matchedCategory.confidence,
        matchedCategory.reason,
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
