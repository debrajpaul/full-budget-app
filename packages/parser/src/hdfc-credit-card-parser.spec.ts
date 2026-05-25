import { HdfcCreditCardParser } from "./hdfc-credit-card-parser";
import { EBankName } from "@common";

describe("HdfcCreditCardParser", () => {
  const parser = new HdfcCreditCardParser();
  const userId = "user123";

  it("should parse valid HDFC credit card statement entries", async () => {
    const statement = [
      "Some heading line",
      "Transaction Type~Card Name~Transaction Date~Transaction Description~Amount~Credit/Debit",
      "Purchase~VISA Signature~12/08/25~Amazon Marketplace~3,200.50~Dr",
      "Refund~VISA Signature~13/08/25~Amazon Refund~400.00~Cr",
      "Cash~VISA Signature~14/08/2025~ATM Withdrawal~1,000.00~dr",
      "Opening Bal~9999",
      "Should not be parsed",
    ].join("\n");

    const txns = await parser.parse(Buffer.from(statement, "utf-8"), userId);

    expect(txns).toHaveLength(3);
    expect(txns[0]).toMatchObject({
      userId,
      bankName: EBankName.hdfc,
      debit: 3200.5,
      credit: 0,
      txnDate: "2025-08-12",
      description: "Amazon Marketplace",
    });
    expect(txns[1]).toMatchObject({
      credit: 400,
      debit: 0,
      txnDate: "2025-08-13",
    });
    expect(txns[2]).toMatchObject({
      debit: 1000,
      credit: 0,
      txnDate: "2025-08-14",
    });
    expect(new Set(txns.map((t) => t.transactionId)).size).toBe(3);
  });

  it("should throw an error when the transaction header is missing", async () => {
    const content = [
      "Totally unrelated header",
      "Purchase~Something~12/08/25~Desc~100~Dr",
    ].join("\n");

    await expect(
      parser.parse(Buffer.from(content, "utf-8"), userId)
    ).rejects.toThrow(
      "Could not find transaction header in HDFC credit card statement."
    );
  });

  it("should skip invalid rows and stop parsing after Opening Bal section", async () => {
    const statement = [
      "Transaction Type~Card Name~Transaction Date~Transaction Description~Amount~Credit/Debit",
      "BadDate~Card~13-08-25~Invalid Date~500.00~Dr",
      "ZeroAmount~Card~14/08/25~Zero Amount~0~Dr",
      "Valid~Card~15/08/25~Gym Membership~800.00~DR",
      "Opening Bal~This should stop parsing",
      "Valid~Card~16/08/25~Should Be Ignored~900.00~Dr",
    ].join("\n");

    const txns = await parser.parse(Buffer.from(statement, "utf-8"), userId);

    expect(txns).toHaveLength(1);
    expect(txns[0]).toMatchObject({
      debit: 800,
      credit: 0,
      txnDate: "2025-08-15",
    });
  });

  it("should format dd/mm/yy and dd/mm/yyyy dates", () => {
    expect(parser["formatDate"]("01/09/25")).toBe("2025-09-01");
    expect(parser["formatDate"]("07/08/1999")).toBe("1999-08-07");
  });

  it("should return undefined for invalid date strings", () => {
    expect(parser["formatDate"]("invalid")).toBeUndefined();
    expect(parser["formatDate"]("01/09")).toBeUndefined();
  });

  describe("parseCsvFormat (comma-delimited net banking download)", () => {
    it("parses single Amount + Cr/Dr column format with dd/mm/yyyy dates", async () => {
      const statement = [
        "Sl. No.,Transaction Date,Transaction Description,Transaction Remarks,Amount (INR),Cr/Dr",
        "1,12/04/2026,Netflix Subscription,,850.00,Dr",
        "2,15/04/2026,Salary Credit,,50000.00,Cr",
        "3,20/04/2026,Swiggy Order,,450.00,DR",
      ].join("\n");

      const txns = await parser.parse(Buffer.from(statement, "utf-8"), userId);

      expect(txns).toHaveLength(3);
      expect(txns[0]).toMatchObject({
        userId,
        bankName: EBankName.hdfc,
        debit: 850,
        credit: 0,
        txnDate: "2026-04-12",
        description: "Netflix Subscription",
      });
      expect(txns[1]).toMatchObject({
        debit: 0,
        credit: 50000,
        txnDate: "2026-04-15",
        description: "Salary Credit",
      });
      expect(txns[2]).toMatchObject({
        debit: 450,
        credit: 0,
        txnDate: "2026-04-20",
      });
      expect(new Set(txns.map((t) => t.transactionId)).size).toBe(3);
    });

    it("parses separate Debit Amount / Credit Amount columns", async () => {
      const statement = [
        "Date,Narration,Debit Amount,Credit Amount,Balance",
        "25/04/2026,Amazon Purchase,2500.00,,",
        "26/04/2026,UPI Credit,,15000.00,",
        "27/04/2026,Fuel - HPCL,3200.50,,",
      ].join("\n");

      const txns = await parser.parse(Buffer.from(statement, "utf-8"), userId);

      expect(txns).toHaveLength(3);
      expect(txns[0]).toMatchObject({
        debit: 2500,
        credit: 0,
        txnDate: "2026-04-25",
        description: "Amazon Purchase",
      });
      expect(txns[1]).toMatchObject({
        debit: 0,
        credit: 15000,
        txnDate: "2026-04-26",
      });
      expect(txns[2]).toMatchObject({
        debit: 3200.5,
        credit: 0,
      });
    });

    it("parses dates in 'dd MMM yyyy' long format", async () => {
      const statement = [
        "Date,Transaction Details,Amount (INR),Cr/Dr",
        "25 Apr 2026,Hotel Booking,12000.00,Dr",
        "01 Jan 2026,Interest Credit,500.00,CR",
      ].join("\n");

      const txns = await parser.parse(Buffer.from(statement, "utf-8"), userId);

      expect(txns).toHaveLength(2);
      expect(txns[0]).toMatchObject({ txnDate: "2026-04-25", debit: 12000 });
      expect(txns[1]).toMatchObject({ txnDate: "2026-01-01", credit: 500 });
    });

    it("skips rows with zero or missing amounts", async () => {
      const statement = [
        "Date,Narration,Debit Amount,Credit Amount,Balance",
        "01/04/2026,Valid Debit,500.00,,",
        "02/04/2026,Zero Row,0.00,0.00,",
        "03/04/2026,Empty Row,,,",
      ].join("\n");

      const txns = await parser.parse(Buffer.from(statement, "utf-8"), userId);

      expect(txns).toHaveLength(1);
      expect(txns[0]).toMatchObject({ debit: 500, txnDate: "2026-04-01" });
    });

    it("skips footer rows matching Generated On / Page No / Statement patterns", async () => {
      const statement = [
        "Date,Transaction Details,Amount (INR),Cr/Dr",
        "10/04/2026,Valid Transaction,300.00,Dr",
        "10/04/2026,Generated On: 2026-05-01,0.00,Dr",
        "10/04/2026,Page No 1 of 3,0.00,Dr",
        "10/04/2026,Statement Summary,0.00,Cr",
      ].join("\n");

      const txns = await parser.parse(Buffer.from(statement, "utf-8"), userId);

      expect(txns).toHaveLength(1);
      expect(txns[0]).toMatchObject({ description: "Valid Transaction" });
    });

    it("throws when no recognizable header row is found", async () => {
      const statement = [
        "Account Number,IFSC,Branch",
        "1234567890,HDFC0001234,Mumbai",
      ].join("\n");

      await expect(
        parser.parse(Buffer.from(statement, "utf-8"), userId)
      ).rejects.toThrow(
        "Could not find transaction header in HDFC credit card statement."
      );
    });

    it("does not mis-detect savings account CSV as credit card format", async () => {
      // Savings account header contains 'withdrawal' and 'deposit' — should throw
      // because the credit-card parser rejects those headers
      const statement = [
        "Date,Narration,Chq./Ref.No.,Value Dt,Withdrawal Amt.,Deposit Amt.,Closing Balance",
        "21/04/2026,ATM Cash,,,5000.00,,",
      ].join("\n");

      await expect(
        parser.parse(Buffer.from(statement, "utf-8"), userId)
      ).rejects.toThrow(
        "Could not find transaction header in HDFC credit card statement."
      );
    });

    it("handles comma-separated amounts with thousand separators", async () => {
      const statement = [
        "Date,Narration,Debit Amount,Credit Amount,Balance",
        '10/05/2026,Foreign Purchase,"1,25,000.00",,',
      ].join("\n");

      const txns = await parser.parse(Buffer.from(statement, "utf-8"), userId);

      expect(txns).toHaveLength(1);
      expect(txns[0]).toMatchObject({ debit: 125000 });
    });
  });

  describe("formatLongDate", () => {
    it("parses 'dd MMM yyyy' with mixed case month", () => {
      expect(parser["formatLongDate"]("25 Apr 2026")).toBe("2026-04-25");
      expect(parser["formatLongDate"]("01 JAN 2025")).toBe("2025-01-01");
      expect(parser["formatLongDate"]("7 dec 2024")).toBe("2024-12-07");
    });

    it("returns undefined for unrecognized formats", () => {
      expect(parser["formatLongDate"]("2026-04-25")).toBeUndefined();
      expect(parser["formatLongDate"]("25/Apr/2026")).toBeUndefined();
      expect(parser["formatLongDate"]("")).toBeUndefined();
    });
  });
});
