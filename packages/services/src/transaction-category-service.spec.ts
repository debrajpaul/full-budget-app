import { mock } from "jest-mock-extended";
import {
  ETenantType,
  ILogger,
  ITransactionStore,
  ICategoryRulesStore,
  ITransactionCategoryRequest,
  EBaseCategories,
  ESubInvestmentCategories,
} from "@common";
import { TransactionCategoryService } from "./transaction-category-service";

describe("TransactionCategoryService", () => {
  let logger: ReturnType<typeof mock<ILogger>>;
  let transactionStore: ReturnType<typeof mock<ITransactionStore>>;
  let rulesStore: ReturnType<typeof mock<ICategoryRulesStore>>;
  let service: TransactionCategoryService;

  beforeEach(() => {
    logger = mock<ILogger>();
    transactionStore = mock<ITransactionStore>();
    rulesStore = mock<ICategoryRulesStore>();
    service = new TransactionCategoryService(
      logger,
      transactionStore,
      rulesStore,
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
    const req: ITransactionCategoryRequest = {
      tenantId: ETenantType.default,
      transactionId: "t1",
      description: "BY TRANSFER-NEFT***ZERODHA BROKING L--",
      createdAt: "2025-01-01",
    };
    const result = await service.process(req);

    expect(result).toBe(true);
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
    service = new TransactionCategoryService(
      logger,
      transactionStore,
      rulesStore,
    );
    const req: ITransactionCategoryRequest = {
      tenantId: ETenantType.default,
      transactionId: "t2",
      description: "Unknown store",
      createdAt: "2025-01-01",
    };

    const result = await service.process(req);

    expect(result).toBe(true);
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
});
