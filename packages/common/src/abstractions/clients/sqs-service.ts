import { ETenantType } from "../users";
import { EBankName, EBankType } from "../bank-parser";
export interface ITransactionSqsRequest {
  bankName: EBankName;
  bankType: EBankType;
  fileName: string;
  fileKey: string;
  userId: string;
  tenantId: ETenantType;
}
export interface ISQSService {
  sendFileMessage(messageBody: ITransactionSqsRequest): Promise<void>;
  receiveFileMessage(): Promise<ITransactionSqsRequest | undefined>;
}
