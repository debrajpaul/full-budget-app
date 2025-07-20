export interface IProcessService {
  process(table: string, queueUrl: string, bucket: string): Promise<void>;
}
