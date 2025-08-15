import { TransactionService } from "./transaction-service";
import { mock } from "jest-mock-extended";
import {
  ILogger,
  IS3Service,
  ISQSService,
  ITransactionStore,
  ITransactionRequest,
  ETenantType,
  EBankName,
} from "@common";

describe("TransactionService", () => {
  let logger: ReturnType<typeof mock<ILogger>>;
  let s3: ReturnType<typeof mock<IS3Service>>;
  let sqs: ReturnType<typeof mock<ISQSService>>;
  let store: ReturnType<typeof mock<ITransactionStore>>;
  let service: TransactionService;

  beforeEach(() => {
    logger = mock<ILogger>();
    s3 = mock<IS3Service>();
    sqs = mock<ISQSService>();
    store = mock<ITransactionStore>();
    service = new TransactionService(logger, s3, sqs, store);
  });

  it("should return false if no SQS message", async () => {
    sqs.receiveFileMessage.mockResolvedValue(undefined);
    const result = await service.processes();
    expect(result).toBe(false);
    expect(logger.warn).toHaveBeenCalledWith("No messages received from SQS");
  });

  it("should process a valid SQS message", async () => {
    const msg: ITransactionRequest = {
      fileKey: "file.pdf",
      fileName: "file.pdf",
      bankName: EBankName.hdfc,
      userId: "user1",
      tenantId: ETenantType.default,
    };
    sqs.receiveFileMessage.mockResolvedValue(msg);
    jest.spyOn(service, "process").mockResolvedValue(true);
    const result = await service.processes();
    expect(result).toBe(true);
    expect(service.process).toHaveBeenCalledWith(msg);
  });

  it("should return false if SQS message is invalid", async () => {
    sqs.receiveFileMessage.mockResolvedValue({} as any);
    const result = await service.processes();
    expect(result).toBe(false);
    expect(logger.error).toHaveBeenCalledWith("Invalid message body:");
  });

  it("should process a file and save transactions", async () => {
    const req: ITransactionRequest = {
      fileKey: "file.pdf",
      fileName: "file.pdf",
      bankName: EBankName.hdfc,
      userId: "user1",
      tenantId: ETenantType.default,
    };
    const buffer = Buffer.from("test");
    const txns = [
      {
        userId: "user1",
        transactionId: "t1",
        bankName: EBankName.hdfc,
        txnDate: "2025-08-15",
        amount: 100,
        description: "desc",
        balance: 1000,
        category: "cat",
        type: "credit",
      },
    ];
    s3.getFile.mockResolvedValue(buffer);
    jest.spyOn(service as any, "parseTransactions").mockResolvedValue(txns);
    store.saveTransactions.mockResolvedValue();
    const result = await service.process(req);
    expect(result).toBe(true);
    expect(s3.getFile).toHaveBeenCalledWith("file.pdf");
    expect(store.saveTransactions).toHaveBeenCalledWith(req.tenantId, txns);
  });

  it("should return false if process throws", async () => {
    s3.getFile.mockRejectedValue(new Error("fail"));
    const req: ITransactionRequest = {
      fileKey: "file.pdf",
      fileName: "file.pdf",
      bankName: EBankName.hdfc,
      userId: "user1",
      tenantId: ETenantType.default,
    };
    const result = await service.process(req);
    expect(result).toBe(false);
    expect(logger.error).toHaveBeenCalledWith(
      "Error processing message",
      expect.any(Error),
    );
  });
});
