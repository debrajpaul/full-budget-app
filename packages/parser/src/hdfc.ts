import { parse } from "csv-parse";
import { IBankParser, ITransaction, EBankName, EBankType } from "@common";
import { Readable } from "stream";

export class HdfcBankParser implements IBankParser {
  public async parse(
    buffer: Buffer,
    userId: string
  ): Promise<Omit<ITransaction, "createdAt" | "tenantId">[]> {
    const txns: Omit<ITransaction, "createdAt" | "tenantId">[] = [];

    const rawText = buffer.toString("utf-8");
    const lines = rawText.split(/\r?\n/);

    // Find the first line that contains the header like "Date,Narration,..."
    const headerIndex = lines.findIndex(
      (line) =>
        line.toLowerCase().includes("date") &&
        line.toLowerCase().includes("narration")
    );

    if (headerIndex === -1) {
      throw new Error("### Could not find valid CSV header in HDFC file.");
    }

    const validCsv = lines.slice(headerIndex).join("\n");

    const parser = parse({
      columns: true,
      skip_empty_lines: true,
      trim: true,
    });

    const stream = Readable.from([validCsv]).pipe(parser);

    for await (const row of stream) {
      const dateRaw = row["Date"];
      const description = row["Narration"] || "";
      const withdrawal = parseFloat(
        (row["Withdrawal Amt."] || "0").replace(/,/g, "")
      );
      const deposit = parseFloat(
        (row["Deposit Amt."] || "0").replace(/,/g, "")
      );
      const balance = parseFloat(
        (row["Closing Balance"] || "0").replace(/,/g, "")
      );

      if (!dateRaw || isNaN(balance)) continue;

      // const amount = deposit || -withdrawal;
      // if (amount === 0 || isNaN(amount)) continue;

      const txnDate = this.formatDate(dateRaw);
      if (!txnDate) continue;

      // optional: check for known junk tokens
      if (/Generated On|Page No|Statement/i.test(description)) continue;

      txns.push({
        userId,
        transactionId: `${userId}#${txnDate.replace(/-/g, "")}#${txns.length}`,
        bankName: EBankName.hdfc,
        bankType: EBankType.savings,
        txnDate,
        credit: deposit,
        debit: withdrawal,
        balance,
        description: description.trim(),
      });
    }
    console.log(`✅ Parsed ${txns.length} transactions from HDFC CSV`);
    if (txns[0]) console.log("### Sample transaction:", txns[0]);
    return txns;
  }

  private formatDate(d: string): string | undefined {
    const parts = d.split("/");
    if (parts.length !== 3) return undefined;
    const [dd, mm, yy] = parts;
    if (!dd || !mm || !yy) return undefined;
    const yyyy = yy.length === 2 ? (+yy < 50 ? `20${yy}` : `19${yy}`) : yy;
    return `${yyyy}-${mm}-${dd}`;
  }
}
