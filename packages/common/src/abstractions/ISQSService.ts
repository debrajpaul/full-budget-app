export interface ISQSService {
  sendFileMessage(queueUrl: string, messageBody: object): Promise<void>;
  receiveFileMessage(queueUrl: string): Promise<any | undefined>;
}
