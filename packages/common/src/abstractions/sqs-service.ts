import { EBankName } from "./index";
export interface ITransactionRequest {
  bank: EBankName;
  fileName: string;
  fileKey: string;
  userId: string;
  tenantId: string;
}
export interface ISQSService {
  sendFileMessage(messageBody: ITransactionRequest): Promise<void>;
  receiveFileMessage(): Promise<ITransactionRequest | undefined>;
}
