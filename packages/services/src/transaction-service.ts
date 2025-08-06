import {
  ILogger,
  EBankName,
  IS3Service,
  ISQSService,
  ITransaction,
  ITransactionStore,
  ITransactionService,
  IMonthlyReview,
  IAnnualReview,
  IcategoryGroup,
  IAggregatedSummary,
} from "@common";
import { HdfcBankParser, SbiBankParser } from "@parser";

export class TransactionService implements ITransactionService {
  private readonly logger: ILogger;
  private readonly s3Service: IS3Service;
  private readonly sqsService: ISQSService;
  private readonly transactionStore: ITransactionStore;

  constructor(
    logger: ILogger,
    s3Service: IS3Service,
    sqsService: ISQSService,
    transactionStore: ITransactionStore,
  ) {
    this.logger = logger;
    this.s3Service = s3Service;
    this.sqsService = sqsService;
    this.transactionStore = transactionStore;
    this.logger.info("ProcessService initialized");
  }

  public async processes(event: any): Promise<boolean[]> {
    this.logger.info("processes started processing messages");
    this.logger.debug("event", { event });
    const results: boolean[] = [];
    for (const record of event.Records) {
      const body = JSON.parse(record.body);
      this.logger.debug("Received job:", body);
      // Process the job...
      const queueUrl = body.queueUrl;
      const bucket = body.bucket;
      let flag: boolean = await this.process(queueUrl, bucket);
      this.logger.debug(`Flag ${flag}`);
      results.push(flag);
    }
    return results;
  }

  public async process(queueUrl: string, bucket: string): Promise<boolean> {
    this.logger.info("process started processing messages");
    try {
      this.logger.debug("SQS Service initialized", {
        sqsService: this.sqsService,
      });
      this.logger.debug("Attempting to receive message from SQS", {
        queueUrl: queueUrl,
      });
      const message = await this.sqsService.receiveFileMessage(queueUrl);
      if (!message) {
        this.logger.warn("No messages received from SQS");
        return false;
      }
      this.logger.debug("###Message received from SQS", { message });
      if (!message.fileKey || !message.bank || !message.userId) {
        this.logger.error("Invalid message body:", message);
        return false;
      }
      this.logger.info(
        `Processing fileKey: ${message.fileKey}, bank: ${message.bank}, userId: ${message.userId}`,
      );
      const fileBuffer = await this.s3Service.getFile(bucket, message.fileKey);
      this.logger.info(`fileBuffer length: ${fileBuffer.length}`);
      const transactions = await this.parseTransactions(
        fileBuffer,
        message.bank,
        message.userId,
      );
      this.logger.debug(`###transactions. -->`, { data: transactions });
      await this.transactionStore.saveTransactions(transactions);
      this.logger.info(`Processed ${transactions.length} transactions.`);
      return true;
    } catch (err) {
      this.logger.error("Error processing message", err as Error);
      return false;
    }
  }

  public async monthlyReview(
    userId: string,
    month: number,
    year: number,
  ): Promise<IMonthlyReview> {
    this.logger.info(`Getting monthlyReview for user`);
    this.logger.debug("User ID, month & year", { userId, month, year });
    const startDate = new Date(year, month - 1, 1).toISOString(); // start of prev month
    const endDate = new Date(year, month, 1).toISOString(); // start of this month
    const transactions = await this.transactionStore.getTransactionsByDateRange(
      userId,
      startDate,
      endDate,
    );
    this.logger.debug(`MonthlyReview transactions`, {
      count: transactions.length,
    });
    // Calculate totals
    let totalIncome = 0;
    let totalExpense = 0;

    transactions.forEach((txn) => {
      const amount = Number(txn.amount);
      if (amount > 0) totalIncome += amount;
      else totalExpense += Math.abs(amount);
    });

    return {
      totalIncome,
      totalExpense,
      netSavings: totalIncome - totalExpense,
      transactions,
    };
  }

  public async annualReview(
    userId: string,
    year: number,
  ): Promise<IAnnualReview> {
    this.logger.info(`Getting annualReview for user`);
    this.logger.debug("User ID, year", { userId, year });
    const startDate = new Date(year, 0, 1).toISOString(); // Jan 1
    const endDate = new Date(year + 1, 0, 1).toISOString(); // Jan 1 next year
    const txns = await this.transactionStore.getTransactionsByDateRange(
      userId,
      startDate,
      endDate,
    );
    this.logger.debug(`AnnualReview transactions`, { count: txns.length });
    // Calculate totals
    let totalIncome = 0;
    let totalExpense = 0;

    txns.forEach((txn) => {
      const amount = Number(txn.amount);
      if (amount > 0) totalIncome += amount;
      else totalExpense += Math.abs(amount);
    });

    return {
      totalIncome,
      totalExpense,
      netSavings: totalIncome - totalExpense,
      transactions: txns,
    };
  }

  public async categoryBreakDown(
    userId: string,
    month: number,
    year: number,
  ): Promise<IcategoryGroup[]> {
    this.logger.info(`Getting categoryBreakDown for user`);
    this.logger.debug("User ID, month & year", { userId, month, year });
    const startDate = new Date(year, month - 1, 1).toISOString(); // start of prev month
    const endDate = new Date(year, month, 0).toISOString(); // start of this month
    const txns = await this.transactionStore.getTransactionsByDateRange(
      userId,
      startDate,
      endDate,
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
      categoryMap[category].totalAmount += txn.amount;
      categoryMap[category].transactions.push(txn);
    }

    return Object.entries(categoryMap).map(([category, data]) => ({
      category,
      totalAmount: data.totalAmount,
      transactions: data.transactions,
    }));
  }

  public async aggregateSummary(
    userId: string,
    year: number,
    month?: number,
  ): Promise<IAggregatedSummary> {
    this.logger.info(`Getting aggregateSummary for user`);
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
      userId,
      startDate,
      endDate,
    );
    this.logger.debug(`AggregateSummary transactions`, { count: txns.length });
    let totalIncome = 0;
    let totalExpense = 0;
    txns.forEach((txn) => {
      const amount = Number(txn.amount);
      if (amount > 0) totalIncome += amount;
      else totalExpense += Math.abs(amount);
    });
    return {
      totalIncome,
      totalExpense,
      netSavings: totalIncome - totalExpense,
    };
  }

  public async filteredTransactions(
    userId: string,
    year: number,
    month: number,
    bankName?: EBankName,
    category?: string,
  ): Promise<ITransaction[]> {
    this.logger.info(`Getting filteredTransactions for user`);
    this.logger.debug("User ID, month & year", { userId, month, year });
    const startDate = new Date(year, month - 1, 1).toISOString(); // start of prev month
    const endDate = new Date(year, month, 0).toISOString(); // start of this month
    const txns = await this.transactionStore.getTransactionsByDateRange(
      userId,
      startDate,
      endDate,
    );
    this.logger.debug(`FilteredTransactions transactions`, {
      count: txns.length,
    });
    if (bankName) {
      txns.filter((txn) => txn.bankName === bankName);
    }
    if (category) {
      txns.filter((txn) => txn.category === category);
    }
    return txns;
  }

  private async parseTransactions(
    buffer: Buffer,
    bank: EBankName,
    userId: string,
  ): Promise<Omit<ITransaction, "createdAt">[]> {
    switch (bank) {
      case EBankName.sbi: {
        const sbiBankParser = new SbiBankParser();
        return sbiBankParser.parse(buffer, userId);
      }
      case EBankName.hdfc: {
        const hdfcBankParser = new HdfcBankParser();
        return hdfcBankParser.parse(buffer, userId);
      }
      default:
        console.warn(`No parser implemented for bank: ${bank}`);
        return [];
    }
  }
}
