import { parse } from "csv-parse";
import { IBankParser, ITransaction, EBankName, EBankType } from "@common";
import { Readable } from "stream";

export class HdfcCreditCardParser implements IBankParser {
  public async parse(
    buffer: Buffer,
    userId: string
  ): Promise<Omit<ITransaction, "createdAt" | "tenantId">[]> {
    const raw = buffer.toString("utf-8");
    // Tilde-delimited format: older HDFC CC statement export
    if (raw.includes("~")) {
      return this.parseTildeFormat(raw, userId);
    }
    // Comma-delimited format: HDFC net banking CSV download
    return this.parseCsvFormat(raw, userId);
  }

  // ── Tilde-delimited (legacy export) ────────────────────────────────────────

  private parseTildeFormat(
    raw: string,
    userId: string
  ): Omit<ITransaction, "createdAt" | "tenantId">[] {
    const txns: Omit<ITransaction, "createdAt" | "tenantId">[] = [];
    const lines = raw.split(/\r?\n/);

    const headerIndex = lines.findIndex((line) =>
      /transaction\s*type/i.test(line)
    );
    if (headerIndex === -1) {
      throw new Error(
        "Could not find transaction header in HDFC credit card statement."
      );
    }

    for (let i = headerIndex + 1; i < lines.length; i++) {
      const rawLine = lines[i];
      if (!rawLine) continue;
      const line = rawLine.trim();
      if (line === "") continue;
      if (/^opening\s+bal/i.test(line)) break;

      const parts = line.split("~").map((p) => p.trim());
      if (parts.length < 6) continue;

      const [, , dateRaw, descriptionRaw, amountRaw, indicatorRaw] = parts;
      const txnDate = this.formatDate(dateRaw);
      if (!txnDate) continue;

      const amtClean = amountRaw.replace(/,/g, "");
      const numeric = parseFloat(amtClean);
      if (Number.isNaN(numeric) || numeric === 0) continue;

      const indicator = (indicatorRaw || "").toLowerCase();
      txns.push({
        userId,
        transactionId: `${userId}#${txnDate.replace(/-/g, "")}#${txns.length}`,
        bankName: EBankName.hdfc,
        bankType: EBankType.creditCard,
        credit: indicator.startsWith("cr") ? numeric : 0,
        debit: !indicator.startsWith("cr") ? numeric : 0,
        balance: 0,
        txnDate,
        description: descriptionRaw.trim(),
      });
    }
    return txns;
  }

  // ── Comma-delimited (net banking download) ─────────────────────────────────

  private async parseCsvFormat(
    raw: string,
    userId: string
  ): Promise<Omit<ITransaction, "createdAt" | "tenantId">[]> {
    const txns: Omit<ITransaction, "createdAt" | "tenantId">[] = [];
    const lines = raw.split(/\r?\n/);

    // Identify the header row: must contain "date" + ("amount" | "narration" |
    // "transaction"), and must NOT contain "withdrawal"/"deposit" (those belong
    // to the savings-account format).
    const headerIndex = lines.findIndex((line) => {
      const lower = line.toLowerCase();
      return (
        lower.includes("date") &&
        (lower.includes("amount") ||
          lower.includes("narration") ||
          lower.includes("transaction")) &&
        !lower.includes("withdrawal") &&
        !lower.includes("deposit")
      );
    });

    if (headerIndex === -1) {
      throw new Error(
        "Could not find transaction header in HDFC credit card statement."
      );
    }

    const csvContent = lines.slice(headerIndex).join("\n");
    const csvParser = parse({
      columns: true,
      skip_empty_lines: true,
      trim: true,
      relax_column_count: true,
    });

    const stream = Readable.from([csvContent]).pipe(csvParser);

    for await (const row of stream) {
      // Case-insensitive, punctuation-stripped column lookup.
      const col = (keys: string[]): string => {
        for (const k of keys) {
          const found = Object.keys(row as Record<string, string>).find((rk) =>
            rk
              .toLowerCase()
              .replace(/[^a-z]/g, "")
              .includes(k)
          );
          if (found)
            return ((row as Record<string, string>)[found] ?? "").trim();
        }
        return "";
      };

      const dateRaw = col(["date"]);
      if (!dateRaw) continue;

      const txnDate = this.formatDate(dateRaw) ?? this.formatLongDate(dateRaw);
      if (!txnDate) continue;

      const description = col([
        "narration",
        "transactiondetails",
        "transactiondescription",
        "transactionremarks",
        "description",
      ]);

      if (/Generated On|Page No|Statement/i.test(description)) continue;

      const amountRaw = col(["amountinr", "amount"]);
      const typeRaw = col(["crdr", "type"]);
      const debitRaw = col(["debitamount"]);
      const creditRaw = col(["creditamount"]);

      let debit = 0;
      let credit = 0;

      if (amountRaw && typeRaw) {
        // Single amount column with CR/DR indicator
        const amount = parseFloat(amountRaw.replace(/,/g, ""));
        if (Number.isNaN(amount) || amount === 0) continue;
        const isCredit = /^cr/i.test(typeRaw);
        credit = isCredit ? amount : 0;
        debit = !isCredit ? amount : 0;
      } else if (debitRaw || creditRaw) {
        // Separate debit / credit columns
        debit = parseFloat((debitRaw || "0").replace(/,/g, "")) || 0;
        credit = parseFloat((creditRaw || "0").replace(/,/g, "")) || 0;
        if (debit === 0 && credit === 0) continue;
      } else {
        continue;
      }

      txns.push({
        userId,
        transactionId: `${userId}#${txnDate.replace(/-/g, "")}#${txns.length}`,
        bankName: EBankName.hdfc,
        bankType: EBankType.creditCard,
        txnDate,
        credit,
        debit,
        balance: 0,
        description: description.trim(),
      });
    }

    return txns;
  }

  // ── Date helpers ───────────────────────────────────────────────────────────

  // Parses dd/mm/yy or dd/mm/yyyy → yyyy-mm-dd
  private formatDate(d: string): string | undefined {
    const parts = d.trim().split("/");
    if (parts.length !== 3) return undefined;
    const [dd, mm, yy] = parts.map((p) => p.trim());
    if (!dd || !mm || !yy) return undefined;
    let yyyy = yy;
    if (yy.length === 2) {
      const yr = parseInt(yy, 10);
      yyyy = yr < 50 ? `20${yy.padStart(2, "0")}` : `19${yy.padStart(2, "0")}`;
    }
    return `${yyyy}-${mm.padStart(2, "0")}-${dd.padStart(2, "0")}`;
  }

  // Parses "25 Apr 2026" or "25 APR 2026" → 2026-04-25
  private formatLongDate(d: string): string | undefined {
    const MONTHS: Record<string, string> = {
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
    const m = d.trim().match(/^(\d{1,2})\s+([A-Za-z]{3})\s+(\d{4})$/);
    if (!m) return undefined;
    const [, dd, mon, yyyy] = m;
    const mm = MONTHS[mon.toLowerCase()];
    if (!mm) return undefined;
    return `${yyyy}-${mm}-${dd!.padStart(2, "0")}`;
  }
}
