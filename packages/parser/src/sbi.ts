import { parse } from "csv-parse";
import { IBankParser, ITransaction, EBankName, EBankType } from "@common";
import { Readable } from "stream";

export class SbiBankParser implements IBankParser {
  public async parse(
    buffer: Buffer,
    userId: string,
  ): Promise<Omit<ITransaction, "createdAt" | "tenantId">[]> {
    const txns: Omit<ITransaction, "createdAt" | "tenantId">[] = [];

    const rawText = buffer.toString("utf-8");
    const lines = rawText.split(/\r?\n/);

    const headerIndex = lines.findIndex(
      (line) => /txn\s+date/i.test(line) && /description/i.test(line),
    );

    if (headerIndex === -1) {
      console.log("****Could not find valid header row in SBI CSV.");
      throw new Error("Could not find valid header row in SBI CSV.");
    }

    console.log("####Detected header line:", lines[headerIndex]);

    const sanitizedLines = lines.slice(headerIndex).map(
      (line) =>
        line
          .replace(/^"|"$/g, "") // remove wrapping quotes
          .replace(/\s*,\s*/g, ",") // trim around commas
          .replace(/,+$/, ""), // remove trailing commas
    );

    // More robust footer trimming
    let endIndex = sanitizedLines.length;
    while (
      endIndex > 0 &&
      (sanitizedLines[endIndex - 1].split(",").length < 5 ||
        /generated|account/i.test(sanitizedLines[endIndex - 1]))
    ) {
      endIndex--;
    }

    const validCsv = sanitizedLines.slice(0, endIndex).join("\n");
    console.log("####Sanitized line count:", sanitizedLines.length);
    console.log("####Valid transaction lines count:", endIndex);
    console.log("####Last line before parsing:", sanitizedLines[endIndex - 1]);

    const parser = parse({
      columns: (header: string[]) =>
        header.map((col) => col.replace(/\s+/g, " ").trim()),
      skip_empty_lines: true,
      trim: true,
    });

    const stream = Readable.from([validCsv]).pipe(parser);
    console.log("###Parsing SBI CSV...");

    let rowIndex = 0;
    for await (const row of stream) {
      if (rowIndex === 0) {
        console.log("####First parsed row:", row);
      }
      rowIndex++;

      const dateRaw = row["Txn Date"];
      const description = row["Description"] || "";
      const withdrawal = parseFloat((row["Debit"] || "0").replace(/,/g, ""));
      const deposit = parseFloat((row["Credit"] || "0").replace(/,/g, ""));
      const balance = parseFloat((row["Balance"] || "0").replace(/,/g, ""));

      if (!dateRaw || isNaN(balance)) continue;

      let amount = 0;
      if (!isNaN(deposit) && deposit > 0) amount = deposit;
      else if (!isNaN(withdrawal) && withdrawal > 0) amount = -withdrawal;

      if (amount === 0 || isNaN(amount)) continue;

      const txnDate = this.formatDate(dateRaw);
      if (!txnDate) continue;

      txns.push({
        userId,
        transactionId: `${userId}#${txnDate.replace(/-/g, "")}#${txns.length}`,
        bankName: EBankName.sbi,
        bankType: EBankType.savings,
        amount,
        txnDate,
        balance,
        description: description.trim(),
      });
    }

    console.log(`✅ Parsed ${txns.length} transactions from SBI CSV`);
    if (txns[0]) console.log("####Sample transaction:", txns[0]);

    return txns;
  }

  private formatDate(d: string): string | undefined {
    // First try dd/mm/yyyy
    const slashParts = d.split("/");
    if (slashParts.length === 3) {
      const [dd, mm, yyyy] = slashParts;
      return `${yyyy}-${mm.padStart(2, "0")}-${dd.padStart(2, "0")}`;
    }

    // Fallback for formats like "2 Apr 2024" or "25 March 2024"
    const parsed = new Date(d);
    if (!isNaN(parsed.getTime())) {
      const yyyy = parsed.getFullYear();
      const mm = String(parsed.getMonth() + 1).padStart(2, "0");
      const dd = String(parsed.getDate()).padStart(2, "0");
      return `${yyyy}-${mm}-${dd}`;
    }

    return undefined;
  }
}
