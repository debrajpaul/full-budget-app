import { ILogger } from '@logger/logger';
import { ISQSService } from '@common/abstractions';
import { SQS, SQSClientConfig, SendMessageCommandInput } from '@aws-sdk/client-sqs';

export type { SQSClientConfig };

export class SQSService implements ISQSService {

  constructor(
      private readonly logger: ILogger,
      private readonly sqs: SQS
  ) {}

  /**
   * Sends a message to the SQS queue (producer).
   */
  async sendFileMessage(queueUrl: string, messageBody: object): Promise<void> {
    this.logger.info('#SendingSQS');
    this.logger.debug('SendingSQS', { queueUrl, messageBody });

    const params: SendMessageCommandInput = {
      QueueUrl: queueUrl,
      MessageBody: JSON.stringify(messageBody),
    };
    const res = await this.sqs.sendMessage(params);
    this.logger.debug('SQS message sent', { queueUrl, messageBody, res });
    this.logger.info('SQS message sent successfully');
  }

  /**
   * Receives and deletes a message from the SQS queue (consumer).
   * Returns the parsed message body, or undefined if no messages.
   */
  async receiveFileMessage(queueUrl: string): Promise<any | undefined> {
    this.logger.info('#ReceivingSQS');
    this.logger.debug('ReceivingSQS', { queueUrl });

    const res = await this.sqs.receiveMessage({
      QueueUrl: queueUrl,
      MaxNumberOfMessages: 1,
      WaitTimeSeconds: 5,
    });
    if (!res.Messages || res.Messages.length === 0) return undefined;
    const message = res.Messages[0];
    await this.sqs.deleteMessage({
      QueueUrl: queueUrl,
      ReceiptHandle: message.ReceiptHandle!,
    });
    return JSON.parse(message.Body!);
  }
}
