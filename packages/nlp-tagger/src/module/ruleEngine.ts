import {
  ILogger,
  EBaseCategories,
  IRawTxn,
  CategorizeResult,
  IRuleEngine,
} from "@common";

export class RuleEngine implements IRuleEngine {
  private readonly logger: ILogger;
  private readonly taggedBy: string = "RULE_ENGINE";

  constructor(logger: ILogger) {
    this.logger = logger;
  }

  private isCreditOrDebit = (t: IRawTxn): "CREDIT" | "DEBIT" | "ANY" => {
    if (t.balance === undefined || t.balance === null || t.balance === 0) {
      return "ANY";
    }
    return t.balance > 0 ? "CREDIT" : "DEBIT";
  };

  private normalizeDescription = (raw: string): string =>
    raw
      .toLowerCase()
      .replace(/\s+/g, " ")
      .replace(/[^a-z0-9 @&/().+\-_:]/g, " ")
      .replace(/\s+/g, " ")
      .trim();

  public categorize(txn: IRawTxn): CategorizeResult {
    this.logger.info(`Categorizing transaction: ${txn.description}`);
    if (!txn.rules || txn.rules.length === 0) {
      return {
        taggedBy: this.taggedBy,
        category: EBaseCategories.unclassified,
        reason: "No rules defined",
        confidence: 0.0,
      };
    }
    const desc = this.normalizeDescription(txn.description || "");
    const side: "CREDIT" | "DEBIT" | "ANY" = this.isCreditOrDebit(txn);

    for (const rule of txn.rules) {
      // Skip if rule is not ANY
      // Skip if rule is not for the same side
      if (rule.when && rule.when !== "ANY" && rule.when !== side) continue;

      // ICategoryRules.match is a RegExp; use test() directly
      const matched = rule.match.test(desc);

      if (matched) {
        return {
          taggedBy: this.taggedBy,
          category: rule.category,
          subCategory: rule.subCategory,
          reason: rule.reason,
          confidence: rule.confidence ?? 0.8,
        };
      }
    }
    return {
      taggedBy: this.taggedBy,
      category: EBaseCategories.unclassified,
      reason: "No rule matched",
      confidence: 0.0,
    };
  }
}
