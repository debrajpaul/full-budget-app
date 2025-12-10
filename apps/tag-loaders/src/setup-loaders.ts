import { ILogger, ITransactionCategoryService } from "@common";
import { TransactionCategoryLoader } from "./loaders/category-loader";

export function setupLoaders(
  logger: ILogger,
  transactionCategoryService: ITransactionCategoryService
) {
  const transactionCategoryLoader = new TransactionCategoryLoader(
    logger.child("TransactionCategoryLoader"),
    transactionCategoryService
  );
  return {
    transactionCategoryLoader,
  };
}
