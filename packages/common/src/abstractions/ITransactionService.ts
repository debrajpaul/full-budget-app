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
export interface ITransactionService {
  processes(event: any): Promise<boolean[]>;
  process(queueUrl: string, bucket: string): Promise<boolean>;
  monthlyReview(
    userId: string,
    month: number,
    year: number,
  ): Promise<IMonthlyReview>;
  annualReview(userId: string, year: number): Promise<IAnnualReview>;
}
