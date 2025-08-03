import { ITransaction } from "./ITransaction";
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
  processes(event: any): Promise<boolean[]>;
  process(queueUrl: string, bucket: string): Promise<boolean>;
  monthlyReview(
    userId: string,
    month: number,
    year: number,
  ): Promise<IMonthlyReview>;
  annualReview(userId: string, year: number): Promise<IAnnualReview>;
  categoryBreakDown(
    userId: string,
    month: number,
    year: number,
  ): Promise<IcategoryGroup[]>;
  aggregateSummary(
    userId: string,
    year: number,
    month?: number,
  ): Promise<IAggregatedSummary>;
}
