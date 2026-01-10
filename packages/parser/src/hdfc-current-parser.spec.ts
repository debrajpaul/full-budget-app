import { HdfcCurrentParser } from "./hdfc-current-parser";
import { EBankName, EBankType } from "@common";

describe("HdfcCurrentParser", () => {
  const parser = new HdfcCurrentParser();
  const userId = "user456";

  it("should parse valid HDFC current account statement entries", async () => {
    const statement = [
      "HDFC Bank Current Account Statement",
      "Generated On: 01/09/2025",
      "Date,Narration,Withdrawal Amt.,Deposit Amt.,Closing Balance",
      '01/08/25,Salary,,"10,000","10,000"',
      '02/08/2025,ATM Withdrawal,"1,500",,"8,500"',
      '03/08/25,Zero Amount,,,"8,500"',
    ].join("\n");

    const txns = await parser.parse(Buffer.from(statement, "utf-8"), userId);

    expect(txns).toHaveLength(2);
    expect(txns[0]).toMatchObject({
      userId,
      bankName: EBankName.hdfc,
      bankType: EBankType.current,
      credit: 10000,
      debit: 0,
      balance: 10000,
      txnDate: "2025-08-01",
      description: "Salary",
    });
    expect(txns[1]).toMatchObject({
      credit: 0,
      debit: 1500,
      balance: 8500,
      txnDate: "2025-08-02",
      description: "ATM Withdrawal",
    });
    expect(new Set(txns.map((t) => t.transactionId)).size).toBe(2);
  });

  it("should throw error when transaction header is missing", async () => {
    const content = [
      "Some preamble",
      "No transaction header here",
      "01/08/25,Salary,,1000,1000",
    ].join("\n");

    await expect(
      parser.parse(Buffer.from(content, "utf-8"), userId)
    ).rejects.toThrow(
      "Could not find valid transaction header in HDFC current account CSV."
    );
  });

  it("should skip invalid rows and ignore zero-amount entries", async () => {
    const statement = [
      "Date,Narration,Withdrawal Amt.,Deposit Amt.,Closing Balance",
      ",Missing Date,100,,1000",
      "BadDate,Invalid Date,100,,1100",
      "04/08/25,Zero Amount,,,1200",
      '05/08/25,Valid Debit,"2,500",,"9,500"',
      '06/08/25,Valid Credit,,"1,200","10,700"',
    ].join("\n");

    const txns = await parser.parse(Buffer.from(statement, "utf-8"), userId);

    expect(txns).toHaveLength(2);
    expect(txns[0]).toMatchObject({
      debit: 2500,
      credit: 0,
      txnDate: "2025-08-05",
    });
    expect(txns[1]).toMatchObject({
      debit: 0,
      credit: 1200,
      txnDate: "2025-08-06",
    });
  });

  it("should format dd/mm/yy and dd/mm/yyyy dates", () => {
    expect(parser["formatDate"]("07/08/25")).toBe("2025-08-07");
    expect(parser["formatDate"]("07/08/50")).toBe("1950-08-07");
    expect(parser["formatDate"]("07/08/1999")).toBe("1999-08-07");
  });

  it("should return undefined for invalid date strings", () => {
    expect(parser["formatDate"]("invalid")).toBeUndefined();
    expect(parser["formatDate"]("01/09")).toBeUndefined();
  });
});
