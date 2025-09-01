import { mock } from "jest-mock-extended";
import {
  ILogger,
  IRecurringTransactionStore,
  ITransactionStore,
  ETenantType,
  ERecurringFrequency,
  IRecurringTransaction,
  EBankName,
} from "@common";
import { RecurringTransactionService } from "./recurring-transaction-service";

describe("RecurringTransactionService", () => {
  let logger: ReturnType<typeof mock<ILogger>>;
  let recurringStore: ReturnType<typeof mock<IRecurringTransactionStore>>;
  let transactionStore: ReturnType<typeof mock<ITransactionStore>>;
  let service: RecurringTransactionService;
  const tenantId = ETenantType.default;
  const userId = "user1";

  beforeEach(() => {
    logger = mock<ILogger>();
    recurringStore = mock<IRecurringTransactionStore>();
    transactionStore = mock<ITransactionStore>();
    service = new RecurringTransactionService(
      logger,
      recurringStore,
      transactionStore,
    );
    jest.spyOn(Date, "now").mockReturnValue(1720000000000); // fixed timestamp
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it("creates recurring with derived fields and delegates to store", async () => {
    const payload = {
      description: "Rent",
      amount: -15000,
      category: "housing",
      frequency: ERecurringFrequency.monthly,
      dayOfMonth: 5,
      startDate: "2025-08-01",
    };
    const expectedId = `${userId}#${Date.now()}`;
    recurringStore.create.mockImplementation(async (_tenant, rec) => ({
      ...(rec as any),
      tenantId,
      createdAt: new Date().toISOString(),
    }));

    const created = await service.create(tenantId, userId, payload);

    expect(recurringStore.create).toHaveBeenCalledWith(
      tenantId,
      expect.objectContaining({
        userId,
        recurringId: expectedId,
        description: payload.description,
        amount: payload.amount,
        category: payload.category,
        frequency: payload.frequency,
        dayOfMonth: payload.dayOfMonth,
        startDate: payload.startDate,
        nextRunDate: payload.startDate,
      }),
    );
    expect(created.recurringId).toBe(expectedId);
  });

  it("lists recurring by user", async () => {
    const item: IRecurringTransaction = {
      tenantId,
      userId,
      recurringId: "user1#rec#1",
      description: "Gym",
      amount: -999,
      category: "fitness",
      frequency: ERecurringFrequency.monthly,
      dayOfMonth: 10,
      startDate: "2025-01-01",
      nextRunDate: "2025-08-10",
      createdAt: "2025-01-01T00:00:00.000Z",
    };
    recurringStore.listByUser.mockResolvedValue([item]);
    const list = await service.list(tenantId, userId);
    expect(recurringStore.listByUser).toHaveBeenCalledWith(tenantId, userId);
    expect(list).toEqual([item]);
  });

  it("materializes monthly occurrences with day clamp (Feb)", async () => {
    const recurring: IRecurringTransaction = {
      tenantId,
      userId,
      recurringId: "user1#rec#feb",
      description: "EndOfMonthCharge",
      amount: -100,
      category: "fees",
      frequency: ERecurringFrequency.monthly,
      dayOfMonth: 31,
      startDate: "2024-01-01",
      createdAt: "2024-01-01T00:00:00.000Z",
    };
    recurringStore.listByUser.mockResolvedValue([recurring]);
    transactionStore.saveTransactions.mockResolvedValue();

    const created = await service.materializeForMonth(
      tenantId,
      userId,
      2,
      2025,
    ); // Feb 2025 -> 28 days

    expect(transactionStore.saveTransactions).toHaveBeenCalledTimes(1);
    const call = transactionStore.saveTransactions.mock.calls[0];
    expect(call[0]).toBe(tenantId);
    const [txn] = call[1];
    expect(txn.transactionId).toBe(
      `${userId}#rec#${recurring.recurringId}#2025-02-28`,
    );
    expect(txn.txnDate).toBe("2025-02-28");
    expect(txn.bankName).toBe(EBankName.other);
    expect(txn.type).toBe("recurring");
    expect(txn.category).toBe("fees");
    expect(created).toHaveLength(1);
  });

  it("materializes weekly occurrences only on selected weekday and within range", async () => {
    const recurring: IRecurringTransaction = {
      tenantId,
      userId,
      recurringId: "user1#rec#weekly",
      description: "Weekly Class",
      amount: -500,
      category: "education",
      frequency: ERecurringFrequency.weekly,
      dayOfWeek: 1, // Monday
      startDate: "2025-08-01",
      endDate: "2025-08-31",
      createdAt: "2025-07-01T00:00:00.000Z",
    } as any;
    recurringStore.listByUser.mockResolvedValue([recurring]);
    transactionStore.saveTransactions.mockResolvedValue();

    const month = 8;
    const year = 2025;

    const created = await service.materializeForMonth(
      tenantId,
      userId,
      month,
      year,
    );

    // Compute Mondays in Aug 2025 for assertion
    const mondays: string[] = [];
    for (
      let d = new Date(year, month - 1, 1);
      d.getMonth() === month - 1;
      d.setDate(d.getDate() + 1)
    ) {
      if (d.getDay() === 1) {
        const mm = String(d.getMonth() + 1).padStart(2, "0");
        const dd = String(d.getDate()).padStart(2, "0");
        mondays.push(`${year}-${mm}-${dd}`);
      }
    }

    expect(transactionStore.saveTransactions).toHaveBeenCalledTimes(
      mondays.length,
    );
    // Verify one of the calls matches the expected transaction date pattern
    const firstDate = mondays[0];
    const found = transactionStore.saveTransactions.mock.calls.some((args) => {
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const [_, txns] = args as any;
      return (
        txns[0].transactionId ===
        `${userId}#rec#${recurring.recurringId}#${firstDate}`
      );
    });
    expect(found).toBe(true);
    expect(created.length).toBe(mondays.length);
  });

  it("materializes yearly only when month matches", async () => {
    const yearly: IRecurringTransaction = {
      tenantId,
      userId,
      recurringId: "user1#rec#yearly",
      description: "Annual Fee",
      amount: -1200,
      category: "fees",
      frequency: ERecurringFrequency.yearly,
      dayOfMonth: 15,
      monthOfYear: 9, // September
      startDate: "2020-01-01",
      createdAt: "2020-01-01T00:00:00.000Z",
    } as any;
    recurringStore.listByUser.mockResolvedValue([yearly]);
    transactionStore.saveTransactions.mockResolvedValue();

    // Non-matching month (August)
    let created = await service.materializeForMonth(tenantId, userId, 8, 2025);
    expect(transactionStore.saveTransactions).not.toHaveBeenCalled();
    expect(created).toHaveLength(0);

    // Matching month (September)
    created = await service.materializeForMonth(tenantId, userId, 9, 2025);
    expect(transactionStore.saveTransactions).toHaveBeenCalledTimes(1);
    const call = transactionStore.saveTransactions.mock.calls[0];
    const [txn] = call[1];
    expect(txn.txnDate).toBe("2025-09-15");
    expect(created).toHaveLength(1);
  });

  it("continues on save error and returns created subset", async () => {
    const recurring: IRecurringTransaction = {
      tenantId,
      userId,
      recurringId: "user1#rec#weekly",
      description: "Weekly",
      amount: -10,
      frequency: ERecurringFrequency.weekly,
      dayOfWeek: 1,
      startDate: "2025-08-01",
      createdAt: "2025-07-01T00:00:00.000Z",
    } as any;
    recurringStore.listByUser.mockResolvedValue([recurring]);
    // Fail first call, succeed subsequent calls
    const err = new Error("dup");
    transactionStore.saveTransactions
      .mockRejectedValueOnce(err)
      .mockResolvedValue();

    const created = await service.materializeForMonth(
      tenantId,
      userId,
      8,
      2025,
    );
    // At least 1 occurrence in Aug; one failed so created length < calls
    expect(created.length).toBeLessThan(
      transactionStore.saveTransactions.mock.calls.length,
    );
    expect(logger.debug).toHaveBeenCalledWith(
      "Skipping duplicate or failed recurring save",
      expect.objectContaining({ error: "dup" }),
    );
  });
});
