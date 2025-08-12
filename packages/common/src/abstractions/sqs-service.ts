import { ETenantType } from "./users";
import { EBankName } from "./bank-parser";
export interface ITransactionRequest {
  bank: EBankName;
  fileName: string;
  fileKey: string;
  userId: string;
  tenantId: ETenantType;
}
export interface ISQSService {
  sendFileMessage(messageBody: ITransactionRequest): Promise<void>;
  receiveFileMessage(): Promise<ITransactionRequest | undefined>;
}
