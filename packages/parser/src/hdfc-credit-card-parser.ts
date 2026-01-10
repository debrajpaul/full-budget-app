import { IBankParser, ITransaction, EBankName, EBankType } from "@common";

export class HdfcCreditCardParser implements IBankParser {
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
    const raw = buffer.toString("utf-8");
    const lines = raw.split(/\r?\n/);

    // Locate the header row for transaction data.  We look for a line
    // containing `Transaction type` to avoid matching the account
    // summary header.  This determines where to start extracting
    // transactions.
    const headerIndex = lines.findIndex((line) =>
      /transaction\s*type/i.test(line)
    );
    if (headerIndex === -1) {
      throw new Error(
        "Could not find transaction header in HDFC credit card statement."
      );
    }

    // Iterate over lines after the header until we hit the beginning of
    // the points summary (which starts with `Opening Bal`).  Each
    // non‑empty line corresponds to a transaction entry.
    for (let i = headerIndex + 1; i < lines.length; i++) {
      const rawLine = lines[i];
      if (!rawLine) continue;

      const line = rawLine.trim();
      if (line === "") continue;

      // Stop when the rewards/points summary begins.
      if (/^opening\s+bal/i.test(line)) {
        break;
      }

      const parts = line.split("~").map((p) => p.trim());
      // Expecting: Transaction Type, Card Name, Transaction Date,
      // Description, Amount, Credit/Debit indicator.
      if (parts.length < 6) continue;

      const [, , dateRaw, descriptionRaw, amountRaw, indicatorRaw] = parts;

      // Normalise and validate date.  Dates are dd/mm/yyyy but may
      // occasionally include 2‑digit years.
      const txnDate = this.formatDate(dateRaw);
      if (!txnDate) continue;
      // Remove commas from the amount.  Some lines may omit the amount
      // entirely; in that case skip.
      const amtClean = amountRaw.replace(/,/g, "");
      const numeric = parseFloat(amtClean);
      if (Number.isNaN(numeric) || numeric === 0) continue;
      // Determine sign based on presence of `Cr` or `cr` in the
      // indicator column.  Any value starting with `cr` is treated as
      // credit; otherwise debit.
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

  /**
   * Convert a date string of the form `dd/mm/yy` or `dd/mm/yyyy` into
   * ISO `yyyy-mm-dd`.  Two‑digit years are interpreted such that
   * values 00–49 map to 2000–2049 and 50–99 map to 1950–1999.
   */
  private formatDate(d: string): string | undefined {
    const parts = d.split("/");
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
}
