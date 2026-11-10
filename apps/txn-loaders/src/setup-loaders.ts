import { ILogger, ITransactionService } from "@app/common";
import { TransactionLoader } from "./loaders/transaction-loader";

export function setupLoaders(
  logger: ILogger,
  transactionService: ITransactionService
) {
  const transactionLoader = new TransactionLoader(
    logger.child("TransactionLoader"),
    transactionService
  );
  return {
    transactionLoader,
  };
}
