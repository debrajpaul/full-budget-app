import { ILogger, ITransactionService } from "@common";
import { TransactionController } from "./controllers/transaction-controller";

export function setupControllers(
  logger: ILogger,
  transactionService: ITransactionService,
) {
  const transactionController = new TransactionController(
    logger.child("TransactionController"),
    transactionService,
  );
  return {
    transactionController,
  };
}
