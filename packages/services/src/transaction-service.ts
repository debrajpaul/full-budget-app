import {
  ILogger,
  EBankName,
  EBankType,
  IS3Service,
  ISQSService,
  ETenantType,
  ITransaction,
  ITransactionStore,
  ITransactionService,
  ITransactionSqsRequest,
  IMonthlyReview,
  IAnnualReview,
  IcategoryGroup,
  IAggregatedSummary,
  EBaseCategories,
  EAllSubCategories,
} from "@common";
import {
  HdfcBankParser,
  SbiBankParser,
  HdfcCurrentParser,
  AxisSavingsParser,
  AxisCreditCardParser,
  HdfcCreditCardParser,
} from "@parser";

export class TransactionService implements ITransactionService {
  private readonly logger: ILogger;
  private readonly s3Service: IS3Service;
  private readonly sqsService: ISQSService;
  private readonly transactionStore: ITransactionStore;

  constructor(
    logger: ILogger,
    s3Service: IS3Service,
    sqsService: ISQSService,
    transactionStore: ITransactionStore
  ) {
    this.logger = logger;
    this.s3Service = s3Service;
    this.sqsService = sqsService;
    this.transactionStore = transactionStore;
    this.logger.debug("ProcessService initialized");
  }

  public async processes(): Promise<boolean> {
    this.logger.debug("processes started processing messages");
    // Process the job...
    this.logger.debug("SQS Service initialized", {
      sqsService: this.sqsService,
    });
    const messageData = await this.sqsService.receiveFileMessage();
    if (!messageData) {
      this.logger.warn("No messages received from SQS");
      return false;
    }
    this.logger.debug("###Message received from SQS", { messageData });
    if (
      !messageData.fileKey ||
      !messageData.bankName ||
      !messageData.bankType ||
      !messageData.userId ||
      !messageData.tenantId
    ) {
      this.logger.error("Invalid message body:");
      return false;
    }
    this.logger.debug(
      `Processing fileKey: ${messageData.fileKey}, bank: ${messageData.bankName}, bankType: ${messageData.bankType}, userId: ${messageData.userId}, tenantId: ${messageData.tenantId}`
    );
    let flag: boolean = await this.process(messageData);
    this.logger.debug(`Flag ${flag}`);
    return flag;
  }

  public async process(request: ITransactionSqsRequest): Promise<boolean> {
    this.logger.debug("process started processing messages");
    try {
      const fileBuffer = await this.s3Service.getFile(request.fileKey);
      this.logger.debug(`fileBuffer length: ${fileBuffer.length}`);
      const transactions = await this.parseTransactions(
        fileBuffer,
        request.bankName,
        request.bankType,
        request.userId
      );
      this.logger.debug(`###transactions. -->`, { data: transactions });
      await this.transactionStore.saveTransactions(
        request.tenantId,
        transactions
      );
      this.logger.debug(`Processed ${transactions.length} transactions.`);
      return true;
    } catch (err) {
      this.logger.error("Error processing message", err as Error);
      return false;
    }
  }

  public async monthlyReview(
    tenantId: ETenantType,
    userId: string,
    month: number,
    year: number
  ): Promise<IMonthlyReview> {
    this.logger.debug(`Getting monthlyReview for user`);
    this.logger.debug("User ID, month & year", { userId, month, year });
    const startDate = new Date(year, month - 1, 1).toISOString(); // start of prev month
    const endDate = new Date(year, month, 1).toISOString(); // start of this month
    const txns = await this.transactionStore.getTransactionsByDateRange(
      tenantId,
      userId,
      startDate,
      endDate
    );
    this.logger.debug(`MonthlyReview transactions`, {
      count: txns.length,
    });
    // Calculate totals
    let totalIncome = 0;
    let totalExpense = 0;

    txns.forEach((txn) => {
      totalExpense += Number(txn.debit);
      totalIncome += Number(txn.credit);
    });

    return {
      totalIncome,
      totalExpense,
      netSavings: totalIncome - totalExpense,
      transactions: txns,
    };
  }

  public async annualReview(
    tenantId: ETenantType,
    userId: string,
    year: number
  ): Promise<IAnnualReview> {
    this.logger.debug(`Getting annualReview for user`);
    this.logger.debug("User ID, year", { userId, year });
    const startDate = new Date(year, 0, 1).toISOString(); // Jan 1
    const endDate = new Date(year + 1, 0, 1).toISOString(); // Jan 1 next year
    const txns = await this.transactionStore.getTransactionsByDateRange(
      tenantId,
      userId,
      startDate,
      endDate
    );
    this.logger.debug(`AnnualReview transactions`, { count: txns.length });
    // Calculate totals
    let totalIncome = 0;
    let totalExpense = 0;

    txns.forEach((txn) => {
      totalExpense += Number(txn.debit);
      totalIncome += Number(txn.credit);
    });

    return {
      totalIncome,
      totalExpense,
      netSavings: totalIncome - totalExpense,
      transactions: txns,
    };
  }

  public async categoryBreakDown(
    tenantId: ETenantType,
    userId: string,
    month: number,
    year: number
  ): Promise<IcategoryGroup[]> {
    this.logger.debug(`Getting categoryBreakDown for user`);
    this.logger.debug("User ID, month & year", { userId, month, year });
    const startDate = new Date(year, month - 1, 1).toISOString(); // start of prev month
    const endDate = new Date(year, month, 0).toISOString(); // start of this month
    const txns = await this.transactionStore.getTransactionsByDateRange(
      tenantId,
      userId,
      startDate,
      endDate
    );
    this.logger.debug(`CategoryBreakDown transactions`, { count: txns.length });
    const categoryMap: Record<
      string,
      { totalAmount: number; transactions: typeof txns }
    > = {};

    for (const txn of txns) {
      const category = txn.category || "Uncategorized";
      if (!categoryMap[category]) {
        categoryMap[category] = { totalAmount: 0, transactions: [] };
      }
      categoryMap[category].totalAmount += Number(txn.credit);
      categoryMap[category].totalAmount -= Number(txn.debit);
      categoryMap[category].transactions.push(txn);
    }

    return Object.entries(categoryMap).map(([category, data]) => ({
      category,
      totalAmount: data.totalAmount,
      transactions: data.transactions,
    }));
  }

  public async aggregateSummary(
    tenantId: ETenantType,
    userId: string,
    year: number,
    month?: number
  ): Promise<IAggregatedSummary> {
    this.logger.debug(`Getting aggregateSummary for user`);
    this.logger.debug("User ID, month & year", { userId, month, year });
    let startDate: string, endDate: string;

    if (month) {
      // Monthly range
      startDate = new Date(year, month - 1, 1).toISOString();
      endDate = new Date(year, month, 0).toISOString();
    } else {
      // Annual range
      startDate = new Date(year, 0, 1).toISOString();
      endDate = new Date(year, 11, 31).toISOString();
    }
    const txns = await this.transactionStore.getTransactionsByDateRange(
      tenantId,
      userId,
      startDate,
      endDate
    );
    this.logger.debug(`AggregateSummary transactions`, { count: txns.length });
    let totalIncome = 0;
    let totalExpense = 0;
    txns.forEach((txn) => {
      totalExpense += Number(txn.debit);
      totalIncome += Number(txn.credit);
    });
    return {
      totalIncome,
      totalExpense,
      netSavings: totalIncome - totalExpense,
    };
  }

  public async filteredTransactions(
    tenantId: ETenantType,
    userId: string,
    year: number,
    month: number,
    bankName?: EBankName,
    category?: string
  ): Promise<ITransaction[]> {
    this.logger.debug(`Getting filteredTransactions for user`);
    this.logger.debug("User ID, month & year", { userId, month, year });
    const startDate = new Date(year, month - 1, 1).toISOString(); // start of prev month
    const endDate = new Date(year, month, 0).toISOString(); // start of this month
    const txns = await this.transactionStore.getTransactionsByDateRange(
      tenantId,
      userId,
      startDate,
      endDate
    );
    this.logger.debug(`FilteredTransactions transactions`, {
      count: txns.length,
    });
    let filtered = txns;

    if (bankName) {
      filtered = filtered.filter((txn) => txn.bankName === bankName);
    }
    if (category) {
      filtered = filtered.filter((txn) => txn.category === category);
    }
    return filtered;
  }

  public async reclassifyTransaction(
    tenantId: ETenantType,
    transactionId: string,
    category: string,
    subCategory?: string,
    taggedBy?: string
  ): Promise<{ id: string; category: string; taggedBy?: string }> {
    await this.transactionStore.updateTransactionCategory(
      tenantId,
      transactionId,
      category as EBaseCategories,
      subCategory as EAllSubCategories,
      taggedBy
    );
    return { id: transactionId, category, taggedBy };
  }

  private async parseTransactions(
    buffer: Buffer,
    bank: EBankName,
    bankType: EBankType,
    userId: string
  ): Promise<Omit<ITransaction, "createdAt" | "tenantId">[]> {
    switch (bank) {
      case EBankName.sbi: {
        const sbiBankParser = new SbiBankParser();
        return sbiBankParser.parse(buffer, userId);
      }
      case EBankName.hdfc: {
        switch (bankType) {
          case EBankType.creditCard: {
            const hdfcCreditCardParser = new HdfcCreditCardParser();
            return hdfcCreditCardParser.parse(buffer, userId);
          }
          case EBankType.current: {
            const hdfcCurrentParser = new HdfcCurrentParser();
            return hdfcCurrentParser.parse(buffer, userId);
          }
          case EBankType.savings: {
            const hdfcBankParser = new HdfcBankParser();
            return hdfcBankParser.parse(buffer, userId);
          }
          default: {
            console.warn(`No parser implemented for bank type: ${bankType}`);
            return [];
          }
        }
      }
      case EBankName.axis: {
        switch (bankType) {
          case EBankType.creditCard: {
            const axisCreditCardParser = new AxisCreditCardParser();
            return axisCreditCardParser.parse(buffer, userId);
          }
          case EBankType.savings: {
            const axisSavingsParser = new AxisSavingsParser();
            return axisSavingsParser.parse(buffer, userId);
          }
          default: {
            console.warn(`No parser implemented for bank type: ${bankType}`);
            return [];
          }
        }
      }
      default: {
        console.warn(`No parser implemented for bank: ${bank}`);
        return [];
      }
    }
  }
}
