export interface ITransactionService {
  processes(event: any): Promise<boolean[]>;
  process(queueUrl: string, bucket: string): Promise<boolean>;
  monthlyReview(userId: string, month: number, year: number): Promise<any>;
}
