import {
  ILogger,
  ITransactionStore,
  ITransactionCategoryService,
  ICategoryRulesStore,
} from "@common";

export class TransactionCategoryService implements ITransactionCategoryService {
  private readonly logger: ILogger;
  private readonly transactionStore: ITransactionStore;
  private readonly categoryRulesStore: ICategoryRulesStore;

  constructor(
    logger: ILogger,
    transactionStore: ITransactionStore,
    categoryRulesStore: ICategoryRulesStore,
  ) {
    this.logger = logger;
    this.transactionStore = transactionStore;
    this.categoryRulesStore = categoryRulesStore;
    this.logger.info("ProcessService initialized");
  }
  public async process(newImage: any): Promise<boolean> {
    this.logger.info("process started processing messages");
    try {
      const tenantId = newImage.tenantId?.S;
      const transactionId = newImage.transactionId?.S;
      const description = newImage.description?.S;
      const category = newImage.category?.S;
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
      // step 3: Fallback to AI tagging
      if (!matchedCategory) {
        this.logger.info(
          `No rule matched for transaction ${transactionId}, falling back to AI tagging`,
        );
        // Here you would call your AI tagging service
        matchedCategory = "AI_TAGGED_CATEGORY"; // Placeholder for AI tagging logic
      }
      // step 4: Update transaction with matched category
      await this.transactionStore.updateTransactionCategory(
        tenantId,
        transactionId,
        matchedCategory,
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
}
