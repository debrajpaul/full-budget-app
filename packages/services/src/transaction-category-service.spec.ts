import { mock } from "jest-mock-extended";
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
import { TransactionCategoryService } from "./transaction-category-service";

describe("TransactionCategoryService", () => {
  let logger: ReturnType<typeof mock<ILogger>>;
  let transactionStore: ReturnType<typeof mock<ITransactionStore>>;
  let rulesStore: ReturnType<typeof mock<ICategoryRulesStore>>;
  let ruleEngine: ReturnType<typeof mock<IRuleEngine>>;
  let bedrockClassifierService: ReturnType<
    typeof mock<IBedrockClassifierService>
  >;
  let service: TransactionCategoryService;

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
      /* aiTaggingEnabled */ true,
    );
  });

  it("categorizes by rules when keyword matches", async () => {
    // New API: getRulesByTenant returns an array of ICategoryRules
    rulesStore.getRulesByTenant.mockResolvedValue([
      {
        ruleId: "r1",
        tenantId: ETenantType.default,
        match: /zerodha/i,
        category: EBaseCategories.investment,
        subCategory: ESubInvestmentCategories.stocks,
        createdAt: new Date(0).toISOString(),
      },
    ] as any);
    // Rule engine now performs the categorization based on description + rules
    ruleEngine.categorize.mockReturnValue({
      category: EBaseCategories.investment,
      subCategory: ESubInvestmentCategories.stocks,
      reason: "Matched zerodha keyword",
      confidence: 0.8,
    });
    const req: ITransactionCategoryRequest = {
      tenantId: ETenantType.default,
      transactionId: "t1",
      description: "BY TRANSFER-NEFT***ZERODHA BROKING L--",
      createdAt: "2025-01-01",
    };
    const result = await service.process(req);

    expect(result).toBe(true);
    expect(ruleEngine.categorize).toHaveBeenCalledTimes(1);
    expect(ruleEngine.categorize).toHaveBeenCalledWith(
      expect.objectContaining({
        description: req.description,
        rules: expect.any(Array),
      }),
    );
    // Should not invoke Bedrock when rules classify successfully
    expect(bedrockClassifierService.classifyWithBedrock).not.toHaveBeenCalled();
    expect(transactionStore.updateTransactionCategory).toHaveBeenCalledWith(
      ETenantType.default,
      "t1",
      EBaseCategories.investment,
      ESubInvestmentCategories.stocks,
      "RULE_ENGINE",
      1,
      undefined,
    );
  });

  it("keeps unclassified when no rule matches", async () => {
    rulesStore.getRulesByTenant.mockResolvedValue([] as any);
    ruleEngine.categorize.mockReturnValue({
      category: EBaseCategories.unclassified,
      reason: "No rule matched",
      confidence: 0,
    });
    (
      bedrockClassifierService.classifyWithBedrock as jest.Mock
    ).mockResolvedValue(null);
    const req: ITransactionCategoryRequest = {
      tenantId: ETenantType.default,
      transactionId: "t2",
      description: "Unknown store",
      createdAt: "2025-01-01",
    };

    const result = await service.process(req);

    expect(result).toBe(true);
    // Bedrock fallback is attempted when unclassified
    expect(bedrockClassifierService.classifyWithBedrock).toHaveBeenCalledWith(
      req.description,
    );
    expect(transactionStore.updateTransactionCategory).toHaveBeenCalledWith(
      ETenantType.default,
      "t2",
      EBaseCategories.unclassified,
      undefined,
      "RULE_ENGINE",
      1,
      undefined,
    );
  });

  it("uses Bedrock fallback when rules return unclassified", async () => {
    rulesStore.getRulesByTenant.mockResolvedValue([] as any);
    ruleEngine.categorize.mockReturnValue({
      category: EBaseCategories.unclassified,
      reason: "No rule matched",
      confidence: 0,
    });
    (
      bedrockClassifierService.classifyWithBedrock as jest.Mock
    ).mockResolvedValue({
      base: EBaseCategories.income,
      sub: undefined,
      confidence: 0.9,
    });
    const req: ITransactionCategoryRequest = {
      tenantId: ETenantType.default,
      transactionId: "t3",
      description: "Some transfer description",
      createdAt: "2025-01-01",
    };

    const result = await service.process(req);
    expect(result).toBe(true);
    expect(bedrockClassifierService.classifyWithBedrock).toHaveBeenCalledWith(
      req.description,
    );
    expect(transactionStore.updateTransactionCategory).toHaveBeenCalledWith(
      ETenantType.default,
      "t3",
      EBaseCategories.income,
      undefined,
      "BEDROCK",
      0.9,
      undefined,
    );
  });

  it("skips processing when already categorized (not UNCLASSIFIED)", async () => {
    const req: ITransactionCategoryRequest = {
      tenantId: ETenantType.default,
      transactionId: "t4",
      description: "Some desc",
      category: EBaseCategories.income,
      createdAt: "2025-01-01",
    };
    const result = await service.process(req);
    expect(result).toBe(false);
    expect(rulesStore.getRulesByTenant).not.toHaveBeenCalled();
    expect(ruleEngine.categorize).not.toHaveBeenCalled();
    expect(bedrockClassifierService.classifyWithBedrock).not.toHaveBeenCalled();
    expect(transactionStore.updateTransactionCategory).not.toHaveBeenCalled();
  });

  it("returns false when required fields are missing", async () => {
    const req = {
      tenantId: ETenantType.default,
      transactionId: "t5",
      // description is missing
      createdAt: "2025-01-01",
    } as unknown as ITransactionCategoryRequest;
    const result = await service.process(req);
    expect(result).toBe(false);
    expect(transactionStore.updateTransactionCategory).not.toHaveBeenCalled();
  });

  it("addRulesByTenant delegates to rules store with keyword map", async () => {
    await service.addRulesByTenant(ETenantType.default);
    expect(rulesStore.addRules).toHaveBeenCalledWith(
      ETenantType.default,
      expect.any(Array),
    );
  });

  it("getCategoriesByTenant returns a plain record of categories", async () => {
    rulesStore.listCategoriesByBase.mockResolvedValue({
      [EBaseCategories.income]: ["Salary", "Bonus"],
      [EBaseCategories.expenses]: ["Food", "Rent"],
    } as any);

    const res = await service.getCategoriesByTenant(ETenantType.default);
    expect(res).toEqual(
      expect.objectContaining({
        [EBaseCategories.income]: expect.arrayContaining(["Salary", "Bonus"]),
        [EBaseCategories.expenses]: expect.arrayContaining(["Food", "Rent"]),
      }),
    );
  });
});
