import { ILogger, EBaseCategories,  IRawTxn, CategorizeResult, IRuleEngine} from "@common";

export class RuleEngine implements IRuleEngine {
  private readonly logger: ILogger;

  constructor(logger: ILogger,) {
    this.logger = logger
  }

  private isCredit = (t: IRawTxn) => (t.credit ?? 0) > 0 && (t.debit ?? 0) === 0;
  private isDebit = (t: IRawTxn) => (t.debit ?? 0) > 0 && (t.credit ?? 0) === 0;
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
        category: EBaseCategories.unclassified,
        reason: "No rules defined",
        confidence: 0.0,
      };
    }
    const desc = this.normalizeDescription(txn.description || "");
    const side: "CREDIT" | "DEBIT" | "ANY" = this.isCredit(txn)
      ? "CREDIT"
      : this.isDebit(txn)
        ? "DEBIT"
        : "ANY";

    for (const rule of txn.rules) {
      if (rule.when && rule.when !== "ANY" && rule.when !== side) continue;

      // ICategoryRules.match is a RegExp; use test() directly
      const matched = rule.match.test(desc);

      if (matched) {
        return {
          category: rule.category,
          subCategory: rule.subCategory,
          reason: rule.reason,
          confidence: rule.confidence ?? 0.8,
        };
      }
    }
    return {
      category: EBaseCategories.unclassified,
      reason: "No rule matched",
      confidence: 0.0,
    };
  }
}
