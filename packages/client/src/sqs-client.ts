import { ILogger, ISQSService, ITransactionSqsRequest } from "@common";
import {
  SQS,
  SQSClientConfig,
  SendMessageCommandInput,
} from "@aws-sdk/client-sqs";

export type { SQSClientConfig };

export class SQSService implements ISQSService {
  constructor(
    private readonly logger: ILogger,
    private readonly queueUrl: string,
    private readonly sqs: SQS
  ) {}

  /**
   * Sends a message to the SQS queue (producer).
   */
  async sendFileMessage(messageBody: ITransactionSqsRequest): Promise<void> {
    this.logger.debug("SendingSQS", { messageBody });

    const params: SendMessageCommandInput = {
      QueueUrl: this.queueUrl,
      MessageBody: JSON.stringify(messageBody),
    };
    const res = await this.sqs.sendMessage(params);
    this.logger.debug("SQS message sent", { messageBody, res });
  }

  /**
   * Receives and deletes a message from the SQS queue (consumer).
   * Returns the parsed message body, or undefined if no messages.
   */
  async receiveFileMessage(): Promise<ITransactionSqsRequest | undefined> {
    this.logger.debug("###ReceivingSQS");

    const res = await this.sqs.receiveMessage({
      QueueUrl: this.queueUrl,
      MaxNumberOfMessages: 1,
      WaitTimeSeconds: 5,
    });
    if (!res.Messages || res.Messages.length === 0) return undefined;
    const message = res.Messages[0];
    this.logger.debug("####SQS message received -->", { message });
    await this.sqs.deleteMessage({
      QueueUrl: this.queueUrl,
      ReceiptHandle: message.ReceiptHandle!,
    });
    return JSON.parse(message.Body!) as ITransactionSqsRequest;
  }
}
