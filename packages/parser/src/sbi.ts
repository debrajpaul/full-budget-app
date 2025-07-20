import { IBankParser } from "@common";
import { parse } from "csv-parse/sync";

export class SbiBankParser implements IBankParser {
  async parse(buffer: Buffer, userId: string): Promise<any[]> {
    const rows = parse(buffer, { columns: true, skip_empty_lines: true });
    return rows.map((row: any, idx: number) => ({
      userId,
      transactionId: `${userId}-sbi-${idx}`,
      date: row.Date,
      amount: parseFloat(row.Amount),
      description: row.Description,
    }));
  }
}
