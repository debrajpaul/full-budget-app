import { AxisCreditCardParser } from "./axis-credit-card-parser";
import { EBankName } from "@common";

describe("AxisCreditCardParser", () => {
  const parser = new AxisCreditCardParser();
  const userId = "user789";

  const validCsv = [
    "Axis Bank Credit Card Statement",
    "Generated On: 01/09/2025",
    "Date,Transaction Details,,Amount (INR),Debit/Credit",
    '01 Aug \'25,Amazon Purchase,,"₹1,234.56",Debit',
    "02 Aug '25,Cashback Reward,,₹500.00,Credit",
    "03/08/25,Utility Payment,,₹750.00,Debit",
    "** End of Statement **",
    "Summary,Not a txn,,₹0.00,Debit",
  ].join("\n");

  it("should parse valid Axis credit card statement", async () => {
    const buffer = Buffer.from(validCsv, "utf-8");
    const txns = await parser.parse(buffer, userId);

    expect(txns).toHaveLength(3);
    expect(txns[0]).toMatchObject({
      userId,
      bankName: EBankName.axis,
      amount: -1234.56,
      txnDate: "2025-08-01",
      description: "Amazon Purchase",
    });
    expect(txns[1].amount).toBe(500);
    expect(txns[1].txnDate).toBe("2025-08-02");
    expect(txns[2].amount).toBe(-750);
    expect(txns[2].txnDate).toBe("2025-08-03");
    expect(new Set(txns.map((t) => t.transactionId)).size).toBe(3);
  });

  it("should throw error when transaction header is missing", async () => {
    const buffer = Buffer.from("Some preamble\nNo valid header here", "utf-8");
    await expect(parser.parse(buffer, userId)).rejects.toThrow(
      "Could not find Axis credit card transactions header in provided CSV.",
    );
  });

  it("should skip rows without usable date or amount and ignore post-sentinel rows", async () => {
    const csv = [
      "Date,Transaction Details,,Amount (INR),Debit/Credit",
      ",Missing Date,,₹100.00,Debit",
      "BadDate,Unknown,,₹200.00,Debit",
      "05 Aug '25,With Parentheses,,(₹300.00),Debit",
      "06/08/25,Valid Credit,,₹400.00,Credit",
      "** End of Statement",
      "07/08/25,After Sentinel,,₹500.00,Credit",
    ].join("\n");
    const buffer = Buffer.from(csv, "utf-8");
    const txns = await parser.parse(buffer, userId);

    expect(txns).toHaveLength(2);
    expect(txns[0]).toMatchObject({
      amount: -300,
      txnDate: "2025-08-05",
    });
    expect(txns[1]).toMatchObject({
      amount: 400,
      txnDate: "2025-08-06",
    });
  });

  it("should format supported date patterns", () => {
    expect(parser["formatDate"]("17 Aug '25")).toBe("2025-08-17");
    expect(parser["formatDate"]("3 Sep 2025")).toBe("2025-09-03");
    expect(parser["formatDate"]("07/08/25")).toBe("2025-08-07");
    expect(parser["formatDate"]("07/08/1999")).toBe("1999-08-07");
  });

  it("should return undefined for invalid dates", () => {
    expect(parser["formatDate"]("Invalid Date")).toBeUndefined();
    expect(parser["formatDate"]("01/08")).toBeUndefined();
  });
});
