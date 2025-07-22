export interface IProcessService {
  processes(event: any): Promise<boolean[]>;
  process(table: string, queueUrl: string, bucket: string): Promise<boolean>;
}
