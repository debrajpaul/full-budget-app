import { ITransaction } from "./transaction";
import { EBankName } from "../bank-parser";
import { ITransactionRequest } from "../sqs-service";

export interface IMonthlyReview {
  totalIncome: number;
  totalExpense: number;
  netSavings: number;
  transactions: ITransaction[];
}
export interface IAnnualReview {
  totalIncome: number;
  totalExpense: number;
  netSavings: number;
  transactions: ITransaction[];
}
export interface IcategoryGroup {
  category: string;
  totalAmount: number;
  transactions: ITransaction[];
}
export interface IAggregatedSummary {
  totalIncome: number;
  totalExpense: number;
  netSavings: number;
}
export interface ITransactionService {
  processes(): Promise<boolean>;
  process(request: ITransactionRequest): Promise<boolean>;
  monthlyReview(
    tenantId: string,
    userId: string,
    month: number,
    year: number,
  ): Promise<IMonthlyReview>;
  annualReview(
    tenantId: string,
    userId: string,
    year: number,
  ): Promise<IAnnualReview>;
  categoryBreakDown(
    tenantId: string,
    userId: string,
    month: number,
    year: number,
  ): Promise<IcategoryGroup[]>;
  aggregateSummary(
    tenantId: string,
    userId: string,
    year: number,
    month?: number,
  ): Promise<IAggregatedSummary>;
  filteredTransactions(
    tenantId: string,
    userId: string,
    year: number,
    month: number,
    bankName?: EBankName,
    category?: string,
  ): Promise<ITransaction[]>;
}
