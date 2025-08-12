export enum EBankName {
  hdfc = "HDFC",
  sbi = "SBI",
  // icici = 'ICICI',
  // axis = 'AXIS',
  // boi = 'BOI',
  // kotak = 'KOTAK',
  // idbi = 'IDBI',
  // ubi = 'UBI',
  // yes = 'YES',
  // canara = 'CANARA',
  other = "OTHER",
}
export interface IBankParser {
  parse(buffer: Buffer, userId: string): Promise<any[]>;
}
