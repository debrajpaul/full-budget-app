import { mock } from "jest-mock-extended";
import {
  ETenantType,
  ILogger,
  INlpService,
  ITransactionStore,
  ICategoryRulesStore,
  ITransactionCategoryRequest,
  EBaseCategories,
} from "@common";
import { TransactionCategoryService } from "./transaction-category-service";

describe("TransactionCategoryService", () => {
  let logger: ReturnType<typeof mock<ILogger>>;
  let transactionStore: ReturnType<typeof mock<ITransactionStore>>;
  let rulesStore: ReturnType<typeof mock<ICategoryRulesStore>>;
  let nlpService: ReturnType<typeof mock<INlpService>>;
  let service: TransactionCategoryService;

  beforeEach(() => {
    logger = mock<ILogger>();
    transactionStore = mock<ITransactionStore>();
    rulesStore = mock<ICategoryRulesStore>();
    nlpService = mock<INlpService>();
    service = new TransactionCategoryService(
      logger,
      transactionStore,
      rulesStore,
      nlpService,
      true,
    );
  });

  it("categorizes by rules when keyword matches", async () => {
    rulesStore.getRulesByTenant.mockResolvedValue({
      zerodha: EBaseCategories.savings,
    });
    const req: ITransactionCategoryRequest = {
      tenantId: ETenantType.default,
      transactionId: "t1",
      description: "BY TRANSFER-NEFT***ZERODHA BROKING L--",
      createdAt: "2025-01-01",
    };
    const result = await service.process(req);

    expect(result).toBe(true);
    expect(nlpService.classifyDescription).not.toHaveBeenCalled();
    expect(transactionStore.updateTransactionCategory).toHaveBeenCalledWith(
      ETenantType.default,
      "t1",
      EBaseCategories.savings,
      "RULE_ENGINE",
      1,
      undefined,
    );
  });

  it("skips AI tagging when disabled via env var", async () => {
    rulesStore.getRulesByTenant.mockResolvedValue({});
    service = new TransactionCategoryService(
      logger,
      transactionStore,
      rulesStore,
      nlpService,
      false,
    );
    const req: ITransactionCategoryRequest = {
      tenantId: ETenantType.default,
      transactionId: "t2",
      description: "Unknown store",
      createdAt: "2025-01-01",
    };

    const result = await service.process(req);

    expect(result).toBe(true);
    expect(nlpService.classifyDescription).not.toHaveBeenCalled();
    expect(transactionStore.updateTransactionCategory).toHaveBeenCalledWith(
      ETenantType.default,
      "t2",
      EBaseCategories.default,
      "RULE_ENGINE",
      1,
      undefined,
    );
  });

  it("falls back to AI tagging when no rule matches", async () => {
    rulesStore.getRulesByTenant.mockResolvedValue({});
    nlpService.analyzeDescription.mockResolvedValue({
      entities: [],
      sentiment: "NEUTRAL",
    });
    type Classification = { Name?: string; Score?: number };
    nlpService.classifyDescription.mockResolvedValue([
      { Name: "Shopping", Score: 0.9 } as Classification,
    ]);
    const req: ITransactionCategoryRequest = {
      tenantId: ETenantType.default,
      transactionId: "t3",
      description: "Amazon purchase",
      createdAt: "2025-01-01",
    };

    const result = await service.process(req);
    expect(result).toBe(true);
    expect(nlpService.analyzeDescription).toHaveBeenCalledWith(
      "Amazon purchase",
    );
    expect(transactionStore.updateTransactionCategory).toHaveBeenCalledWith(
      ETenantType.default,
      "t3",
      "Shopping",
      "AI_TAGGER",
      0.9,
      undefined,
    );
  });
});
