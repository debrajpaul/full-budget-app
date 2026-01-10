import { parse } from "csv-parse";
import { IBankParser, ITransaction, EBankName, EBankType } from "@common";
import { Readable } from "stream";

export class AxisSavingsParser implements IBankParser {
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

    // Convert the buffer into a string without altering the text.  The
    // statement may contain embedded newlines in the preamble.
    const rawText = buffer.toString("utf-8");
    const lines = rawText.split(/\r?\n/);

    // Locate the CSV header row.  We look for the presence of the
    // expected column names rather than relying on an exact match so
    // that minor variations (e.g. spacing or capitalisation) are
    // tolerated.
    const headerIndex = lines.findIndex((line) => {
      const lower = line.toLowerCase();
      return (
        lower.includes("tran date") &&
        lower.includes("particulars") &&
        (lower.includes(",dr,") || lower.includes(",cr,"))
      );
    });

    if (headerIndex === -1) {
      throw new Error(
        "Could not find Axis savings account transactions header in provided CSV."
      );
    }

    // Collect all lines starting from the header until we hit a blank
    // line or a line that appears to be part of the narrative after
    // transactions (e.g. enclosed in quotes).  We include the header
    // itself as the first line to preserve the column names for the
    // parser.  Empty lines within the transaction block are ignored.
    const dataLines: string[] = [];
    for (let i = headerIndex; i < lines.length; i++) {
      const line = lines[i];
      if (line.trim() === "") {
        // Stop when we encounter the first completely empty line after
        // transactions.  Many Axis statements include narrative text
        // separated by a blank line after the transaction table.
        if (dataLines.length > 0) break;
        continue;
      }
      // If the line begins with a quote, it's part of the legal/narrative
      // section following the transactions; stop accumulating lines.
      if (/^\s*"/.test(line)) {
        break;
      }
      dataLines.push(line);
    }

    const validCsv = dataLines.join("\n");

    // Create a CSV parser.  `columns: true` returns objects keyed by
    // header names.  We do not trim values here because we need to
    // remove currency symbols and whitespace manually.
    const parser = parse({
      columns: true,
      skip_empty_lines: true,
    });
    const stream = Readable.from([validCsv]).pipe(parser);

    for await (const row of stream) {
      // Normalise keys to lowercase for easier access.  Header names may
      // vary slightly depending on how the CSV was generated.
      const lowercased: Record<string, string> = {};
      for (const key of Object.keys(row)) {
        lowercased[key.toLowerCase()] = (row as any)[key];
      }

      const dateRaw = lowercased["tran date"] ?? lowercased["date"];
      const desc = lowercased["particulars"] ?? "";
      const drRaw = lowercased["dr"] ?? "";
      const crRaw = lowercased["cr"] ?? "";
      const balRaw = lowercased["bal"] ?? lowercased["balance"];

      if (!dateRaw) {
        continue;
      }

      const txnDate = this.formatDate(String(dateRaw));
      if (!txnDate) {
        continue;
      }

      // Helper to convert raw amount strings into numbers.  The Axis
      // savings account CSV uses spaces for alignment but no rupee
      // symbol; it may include commas as thousands separators.  Empty
      // strings or hyphens are treated as zero.  Parentheses are not
      // expected but we handle them defensively.
      const toNumber = (val: string | undefined): number => {
        if (!val) return 0;
        const trimmed = String(val)
          .replace(/[₹\s,]/g, "")
          .replace(/^"|"$/g, "");
        if (trimmed === "" || trimmed === "-" || trimmed === "- ") {
          return 0;
        }
        let amtStr = trimmed;
        if (amtStr.startsWith("(") && amtStr.endsWith(")")) {
          amtStr = amtStr.slice(1, -1);
        }
        const num = parseFloat(amtStr);
        return Number.isNaN(num) ? 0 : num;
      };

      const debitAmount = toNumber(drRaw);
      const creditAmount = toNumber(crRaw);
      const balanceAmount = toNumber(balRaw);

      // Ignore rows where both debit and credit are zero; these may be
      // header separators or malformed lines.
      if (debitAmount === 0 && creditAmount === 0) {
        continue;
      }

      txns.push({
        userId,
        transactionId: `${userId}#${txnDate.replace(/-/g, "")}#${txns.length}`,
        bankName: EBankName.axis,
        bankType: EBankType.savings,
        credit: creditAmount,
        debit: debitAmount,
        balance: balanceAmount,
        txnDate,
        description: String(desc).trim(),
      });
    }

    return txns;
  }

  /**
   * Normalise dates into ISO format (YYYY-MM-DD).  Axis statements
   * present dates in `DD-MM-YYYY` format separated by either dashes or
   * slashes.  If the date cannot be parsed it returns undefined.
   */
  private formatDate(d: string): string | undefined {
    const trimmed = d.trim().replace(/"/g, "");
    // Match dd-mm-yyyy or dd/mm/yyyy or d-m-yy etc.
    const parts = trimmed.split(/[-/]/);
    if (parts.length === 3) {
      let [dd, mm, yy] = parts;
      // Normalise day and month to two digits
      dd = dd.padStart(2, "0");
      mm = mm.padStart(2, "0");
      // Handle two-digit years by assuming 00–49 -> 2000–2049, 50–99 -> 1950–1999
      let yyyy = yy;
      if (yy.length === 2) {
        const yr = parseInt(yy, 10);
        yyyy =
          yr < 50 ? `20${yy.padStart(2, "0")}` : `19${yy.padStart(2, "0")}`;
      }
      return `${yyyy}-${mm}-${dd}`;
    }
    return undefined;
  }
}
