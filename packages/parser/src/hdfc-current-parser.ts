import { parse } from "csv-parse";
import { IBankParser, ITransaction, EBankName, EBankType } from "@common";
import { Readable } from "stream";

export class HdfcCurrentParser implements IBankParser {
  /**
   * Parse the provided CSV buffer and return a list of transaction
   * descriptors.  The returned objects omit the `createdAt` and `tenantId`
   * fields defined on `ITransaction` because those are assigned by the
   * service later.  Both debit and credit amounts are returned as
   * positive numbers; callers should rely on the `debit`/`credit`
   * distinction rather than the sign.
   *
   * @param buffer Raw CSV file contents
   * @param userId ID of the user owning these transactions
   */
  public async parse(
    buffer: Buffer,
    userId: string
  ): Promise<Omit<ITransaction, "createdAt" | "tenantId">[]> {
    const txns: Omit<ITransaction, "createdAt" | "tenantId">[] = [];

    // Convert the raw buffer into a UTF‑8 string and split into lines.
    const rawText = buffer.toString("utf-8");
    const lines = rawText.split(/\r?\n/);

    // Locate the header row.  The header contains both `date` and `narration`
    // to ensure we start reading at the correct point.  We use a case‑
    // insensitive match so minor variations are tolerated.
    const headerIndex = lines.findIndex(
      (line) =>
        line.toLowerCase().includes("date") &&
        line.toLowerCase().includes("narration")
    );
    if (headerIndex === -1) {
      throw new Error(
        "Could not find valid transaction header in HDFC current account CSV."
      );
    }

    // Extract all lines from the header onwards.  We rely on downstream
    // filtering to drop summary rows and other non‑transaction lines.
    const csvData = lines.slice(headerIndex).join("\n");

    // Create a CSV parser.  `columns: true` produces objects keyed on the
    // header names.  We specify `trim: true` to strip leading/trailing
    // whitespace on each field.
    const parser = parse({
      columns: true,
      skip_empty_lines: true,
      trim: true,
    });
    const stream = Readable.from([csvData]).pipe(parser);

    for await (const row of stream) {
      // Raw values from the CSV.  The column names are taken from the
      // header; they may include spaces or punctuation exactly as in the
      // statement.
      const dateRaw: string = row["Date"];
      const desc: string = row["Narration"] || "";
      const withdrawalRaw: string = row["Withdrawal Amt."] || "";
      const depositRaw: string = row["Deposit Amt."] || "";
      const balanceRaw: string = row["Closing Balance"] || "";

      // Filter out rows without a valid date.  We expect a date of the
      // form dd/mm/yy or dd/mm/yyyy.  Lines like `********` or
      // `Opening Balance` will not match and are skipped.
      const txnDate = this.formatDate(dateRaw);
      if (!txnDate) {
        continue;
      }

      // Convert amounts into numbers.  Empty strings are treated as zero.
      const toNumber = (val: string): number => {
        if (!val) return 0;
        const cleaned = val.replace(/,/g, "").trim();
        return cleaned === "" ? 0 : parseFloat(cleaned);
      };
      const debit = toNumber(withdrawalRaw);
      const credit = toNumber(depositRaw);
      const balance = toNumber(balanceRaw);

      // Skip rows where both debit and credit are zero; these are likely
      // separators or formatting lines.
      if (debit === 0 && credit === 0) {
        continue;
      }

      txns.push({
        userId,
        transactionId: `${userId}#${txnDate.replace(/-/g, "")}#${txns.length}`,
        bankName: EBankName.hdfc,
        bankType: EBankType.current,
        credit,
        debit,
        balance,
        txnDate,
        description: desc.trim(),
      });
    }

    return txns;
  }

  /**
   * Convert a date string of the form `dd/mm/yy` or `dd/mm/yyyy` into
   * ISO `yyyy-mm-dd`.  Two‑digit years 00–49 are mapped to 2000–2049 and
   * 50–99 to 1950–1999.  Strings that do not match the expected pattern
   * return undefined.
   */
  private formatDate(d: string): string | undefined {
    if (!d) return undefined;
    const parts = d.split("/");
    if (parts.length !== 3) return undefined;
    const [dd, mm, yy] = parts.map((p) => p.trim());
    if (!dd || !mm || !yy) return undefined;
    // Ensure day and month are two digits.
    const day = dd.padStart(2, "0");
    const month = mm.padStart(2, "0");
    let year = yy;
    if (yy.length === 2) {
      const yr = parseInt(yy, 10);
      year = yr < 50 ? `20${yy.padStart(2, "0")}` : `19${yy.padStart(2, "0")}`;
    }
    // Validate that day and month are numeric.
    if (!/^\d+$/.test(day) || !/^\d+$/.test(month) || !/^\d+$/.test(year)) {
      return undefined;
    }
    return `${year}-${month}-${day}`;
  }
}
