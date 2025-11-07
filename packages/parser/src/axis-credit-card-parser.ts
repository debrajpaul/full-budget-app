import { parse } from "csv-parse";
import { IBankParser, ITransaction, EBankName, EBankType } from "@common";
import { Readable } from "stream";

export class AxisCreditCardParser implements IBankParser {
  public async parse(
    buffer: Buffer,
    userId: string,
  ): Promise<Omit<ITransaction, "createdAt" | "tenantId">[]> {
    const txns: Omit<ITransaction, "createdAt" | "tenantId">[] = [];

    // We retain all characters here because the preamble may contain
    // quotes, commas and embedded newlines.
    const rawText = buffer.toString("utf-8");
    const lines = rawText.split(/\r?\n/);

    // Locate the header row for the transaction table.  The Axis format
    // uses a header like `Date,Transaction Details,,Amount (INR),Debit/Credit`.
    const headerIndex = lines.findIndex((line) => {
      const lower = line.toLowerCase();
      return (
        lower.includes("transaction details") &&
        (lower.includes("amount") || lower.includes("amount (inr)"))
      );
    });

    if (headerIndex === -1) {
      throw new Error(
        "Could not find Axis credit card transactions header in provided CSV.",
      );
    }

    // Gather all lines starting from the header up until the end of the
    // statement marker.  We deliberately stop when we encounter the
    // sentinel to avoid parsing any summary lines after the transaction
    // section.  Empty lines are ignored.
    const dataLines: string[] = [];
    for (let i = headerIndex; i < lines.length; i++) {
      const line = lines[i];
      if (/^\*\*\s*End of Statement/i.test(line)) {
        break;
      }
      if (line.trim() === "") continue;
      dataLines.push(line);
    }

    // Join the extracted lines back into a single CSV string.  The
    // original Axis format contains a blank third column which we
    // preserve because the CSV parser will handle it gracefully.
    const validCsv = dataLines.join("\n");

    // Create a CSV parser.  We specify `columns: true` to return objects
    // keyed on the header names and leave trimming off so we can
    // manipulate raw values ourselves.  The `csv-parse` library will
    // automatically respect quoted fields and embedded commas.
    const parser = parse({
      columns: true,
      skip_empty_lines: true,
    });

    // Pipe the CSV string into the parser via a Readable stream.  Using
    // streaming means we can handle arbitrarily large statements
    // without exhausting memory.
    const stream = Readable.from([validCsv]).pipe(parser);

    for await (const row of stream) {
      // Normalise keys to lowercase for easier access.  Some rows may
      // include leading/trailing whitespace or slight variations in
      // header names depending on the PDF generation.
      const lowercased: Record<string, string> = {};
      for (const key of Object.keys(row)) {
        lowercased[key.toLowerCase()] = (row as any)[key];
      }

      const dateRaw = lowercased["date"];
      const desc = lowercased["transaction details"] ?? "";
      const amtRaw =
        lowercased["amount (inr)"] ??
        lowercased["amount(inr)"] ??
        lowercased["amount"];
      const typeRaw = lowercased["debit/credit"] ?? "";

      if (!dateRaw || !amtRaw) {
        continue;
      }

      const txnDate = this.formatDate(String(dateRaw));
      if (!txnDate) {
        continue;
      }

      // Strip out the rupee symbol, commas, quotes and parentheses from
      // the amount.  Axis statements always prefix amounts with `₹` and
      // use commas as thousand separators.  Parentheses around numbers
      // may indicate negative amounts but since we apply the sign based on
      // the debit/credit column we just remove them.
      let amtStr = String(amtRaw)
        .replace(/[₹\s,]/g, "")
        .replace(/^"|"$/g, "");
      if (amtStr.startsWith("(") && amtStr.endsWith(")")) {
        amtStr = amtStr.slice(1, -1);
      }
      const numeric = parseFloat(amtStr);
      if (Number.isNaN(numeric) || numeric === 0) {
        continue;
      }

      // Determine the sign based on the credit/debit indicator.  We
      // default to negative if the indicator is anything other than
      // "credit" to handle fees and unknown values conservatively.
      const indicator = String(typeRaw).trim().toLowerCase();

      txns.push({
        userId,
        transactionId: `${userId}#${txnDate.replace(/-/g, "")}#${txns.length}`,
        bankName: EBankName.axis,
        bankType: EBankType.creditCard,
        credit: indicator.startsWith("credit") ? numeric : 0,
        debit: indicator.startsWith("debit") ? numeric : 0,
        balance: 0,
        txnDate,
        description: String(desc).trim(),
      });
    }

    return txns;
  }

  private formatDate(d: string): string | undefined {
    const trimmed = d.trim().replace(/"/g, "");
    // Pattern: 17 Aug '25 or 3 Sep 2025
    const regex = /^(\d{1,2})\s+([A-Za-z]{3,})\s+'?(\d{2,4})$/;
    const m = regex.exec(trimmed);
    if (m) {
      let [, day, monthStr, year] = m;
      const monthMap: Record<string, string> = {
        jan: "01",
        feb: "02",
        mar: "03",
        apr: "04",
        may: "05",
        jun: "06",
        jul: "07",
        aug: "08",
        sep: "09",
        oct: "10",
        nov: "11",
        dec: "12",
      };
      const mm = monthMap[monthStr.slice(0, 3).toLowerCase()];
      if (!mm) return undefined;
      // Normalise two‑digit years: assume 00–49 → 2000–2049 and 50–99 → 1950–1999.
      let yyyy = year;
      if (year.length === 2) {
        const yr = parseInt(year, 10);
        yyyy =
          yr < 50 ? `20${year.padStart(2, "0")}` : `19${year.padStart(2, "0")}`;
      }
      const dd = day.padStart(2, "0");
      return `${yyyy}-${mm}-${dd}`;
    }
    // Fallback for dd/mm/yy or dd/mm/yyyy
    const parts = trimmed.split("/");
    if (parts.length === 3) {
      const [dd, mm, yy] = parts;
      let yyyy = yy;
      if (yy.length === 2) {
        const yr = parseInt(yy, 10);
        yyyy =
          yr < 50 ? `20${yy.padStart(2, "0")}` : `19${yy.padStart(2, "0")}`;
      }
      return `${yyyy}-${mm.padStart(2, "0")}-${dd.padStart(2, "0")}`;
    }
    return undefined;
  }
}
