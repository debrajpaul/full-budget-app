export interface IBankParser {
  parse(buffer: Buffer, userId: string): Promise<any[]>;
}
