import { mock, MockProxy } from "jest-mock-extended";
import {
  ETenantType,
  ILogger,
  ITransactionStore,
  ICategoryRulesStore,
  ITransactionCategoryRequest,
  EBaseCategories,
  ESubInvestmentCategories,
  IRuleEngine,
  IBedrockClassifierService,
} from "@common";
import { keywordBaseCategoryMap } from "@nlp-tagger";
import { TransactionCategoryService } from "./transaction-category-service";

describe("TransactionCategoryService", () => {
  let logger: MockProxy<ILogger>;
  let transactionStore: MockProxy<ITransactionStore>;
  let rulesStore: MockProxy<ICategoryRulesStore>;
  let ruleEngine: MockProxy<IRuleEngine>;
  let bedrockClassifierService: MockProxy<IBedrockClassifierService>;
  let service: TransactionCategoryService;

  const makeRequest = (
    overrides: Partial<ITransactionCategoryRequest> = {}
  ): ITransactionCategoryRequest => ({
    tenantId: ETenantType.default,
    transactionId: "txn-123",
    description: "Netflix subscription",
    category: EBaseCategories.unclassified,
    credit: 0,
    debit: 120.55,
    createdAt: new Date().toISOString(),
    ...overrides,
  });

  beforeEach(() => {
    logger = mock<ILogger>();
    transactionStore = mock<ITransactionStore>();
    rulesStore = mock<ICategoryRulesStore>();
    ruleEngine = mock<IRuleEngine>();
    bedrockClassifierService = mock<IBedrockClassifierService>();

    service = new TransactionCategoryService(
      logger,
      transactionStore,
      rulesStore,
      ruleEngine,
      bedrockClassifierService,
      /* aiTaggingEnabled */ true
    );

    rulesStore.getRulesByTenant.mockResolvedValue([]);
    transactionStore.updateTransactionCategory.mockResolvedValue();
  });

  it("logs a debug message when initialized", () => {
    expect(logger.debug).toHaveBeenCalledWith("ProcessService initialized");
  });

  describe("process", () => {
    it("categorizes using rule engine results and updates the store", async () => {
      const rules: Awaited<
        ReturnType<ICategoryRulesStore["getRulesByTenant"]>
      > = [] as unknown as Awaited<
        ReturnType<ICategoryRulesStore["getRulesByTenant"]>
      >;
      rulesStore.getRulesByTenant.mockResolvedValue(rules);
      const categorizeResult = {
        category: EBaseCategories.expenses,
        subCategory: undefined,
        taggedBy: "RULE",
        reason: "Matched rule",
        confidence: 0.84,
      };
      ruleEngine.categorize.mockReturnValue(categorizeResult);

      const request = makeRequest();
      const result = await service.process(request);

      expect(result).toBe(true);
      expect(ruleEngine.categorize).toHaveBeenCalledWith({
        description: request.description,
        rules,
        credit: request.credit,
        debit: request.debit,
      });
      expect(transactionStore.updateTransactionCategory).toHaveBeenCalledWith(
        request.tenantId,
        request.transactionId,
        categorizeResult.category,
        categorizeResult.subCategory,
        categorizeResult.taggedBy,
        categorizeResult.confidence,
        categorizeResult.reason,
        undefined
      );
      expect(logger.debug).toHaveBeenCalledWith(
        `Transaction ${request.transactionId} categorized`
      );
      expect(logger.info).toHaveBeenCalledWith(
        "process started processing messages"
      );
    });

    it("falls back to Bedrock when rules return UNCLASSIFIED", async () => {
      ruleEngine.categorize.mockReturnValue({
        category: EBaseCategories.unclassified,
        taggedBy: "RULE",
      });
      bedrockClassifierService.classifyWithBedrock.mockResolvedValue({
        base: EBaseCategories.income,
        sub: ESubInvestmentCategories.stocks,
        reason: "High confidence AI match",
        confidence: 0.92,
      });

      const request = makeRequest();
      const result = await service.process(request);

      expect(result).toBe(true);
      expect(bedrockClassifierService.classifyWithBedrock).toHaveBeenCalledWith(
        request.description
      );
      expect(transactionStore.updateTransactionCategory).toHaveBeenCalledWith(
        request.tenantId,
        request.transactionId,
        EBaseCategories.income,
        ESubInvestmentCategories.stocks,
        "BEDROCK",
        0.92,
        "High confidence AI match",
        undefined
      );
    });

    it("uses default AI metadata when Bedrock omits optional fields", async () => {
      ruleEngine.categorize.mockReturnValue({
        category: EBaseCategories.unclassified,
        taggedBy: "RULE",
      });
      bedrockClassifierService.classifyWithBedrock.mockResolvedValue({
        base: EBaseCategories.expenses,
      });

      const request = makeRequest();
      await service.process(request);

      expect(transactionStore.updateTransactionCategory).toHaveBeenCalledWith(
        request.tenantId,
        request.transactionId,
        EBaseCategories.expenses,
        undefined,
        "BEDROCK",
        0.7,
        "AI fallback",
        undefined
      );
    });

    it("continues with rule engine result when Bedrock returns no match", async () => {
      ruleEngine.categorize.mockReturnValue({
        category: EBaseCategories.unclassified,
        taggedBy: "RULE",
      });
      bedrockClassifierService.classifyWithBedrock.mockResolvedValue(null);

      const request = makeRequest();
      await service.process(request);

      expect(bedrockClassifierService.classifyWithBedrock).toHaveBeenCalledWith(
        request.description
      );
      expect(transactionStore.updateTransactionCategory).toHaveBeenCalledWith(
        request.tenantId,
        request.transactionId,
        EBaseCategories.unclassified,
        undefined,
        "RULE",
        undefined,
        undefined,
        undefined
      );
    });

    it("does not call Bedrock when AI tagging is disabled", async () => {
      service = new TransactionCategoryService(
        logger,
        transactionStore,
        rulesStore,
        ruleEngine,
        bedrockClassifierService,
        /* aiTaggingEnabled */ false
      );
      ruleEngine.categorize.mockReturnValue({
        category: EBaseCategories.unclassified,
        taggedBy: "RULE",
      });

      const request = makeRequest();
      await service.process(request);

      expect(
        bedrockClassifierService.classifyWithBedrock
      ).not.toHaveBeenCalled();
      expect(transactionStore.updateTransactionCategory).toHaveBeenCalledWith(
        request.tenantId,
        request.transactionId,
        EBaseCategories.unclassified,
        undefined,
        "RULE",
        undefined,
        undefined,
        undefined
      );
      expect(logger.info).toHaveBeenCalledWith(
        "process started processing messages"
      );
    });

    it("returns false and logs error when processing fails", async () => {
      ruleEngine.categorize.mockReturnValue({
        category: EBaseCategories.expenses,
        taggedBy: "RULE",
      });
      transactionStore.updateTransactionCategory.mockRejectedValue(
        new Error("DB down")
      );

      const result = await service.process(makeRequest());

      expect(result).toBe(false);
      expect(logger.error).toHaveBeenCalledWith(
        "Error processing message",
        expect.any(Error)
      );
    });
  });

  it("adds rules for a tenant using the shared keyword map", async () => {
    await service.addRulesByTenant(ETenantType.default);

    expect(rulesStore.addRules).toHaveBeenCalledWith(
      ETenantType.default,
      keywordBaseCategoryMap
    );
    expect(logger.debug).toHaveBeenCalledWith(
      `Adding rules for tenant ${ETenantType.default}`
    );
  });

  it("returns categories grouped by base as plain records", async () => {
    const grouped: Record<EBaseCategories, string[]> = {
      [EBaseCategories.expenses]: ["Food", "Rent"],
      [EBaseCategories.income]: ["Salary"],
      [EBaseCategories.savings]: [],
      [EBaseCategories.transfer]: [],
      [EBaseCategories.loan]: [],
      [EBaseCategories.investment]: [],
      [EBaseCategories.unclassified]: [],
    };
    rulesStore.listCategoriesByBase.mockResolvedValue(grouped);

    const result = await service.getCategoriesByTenant(ETenantType.default);

    expect(result).toEqual({
      [EBaseCategories.expenses]: ["Food", "Rent"],
      [EBaseCategories.income]: ["Salary"],
      [EBaseCategories.savings]: [],
      [EBaseCategories.transfer]: [],
      [EBaseCategories.loan]: [],
      [EBaseCategories.investment]: [],
      [EBaseCategories.unclassified]: [],
    });
  });
});
