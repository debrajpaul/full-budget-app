export interface ITransactionCategoryService {
  process(request: any): Promise<boolean>;
}
