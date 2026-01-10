import { AxisSavingsParser } from "./axis-savings-parser";
import { EBankName, EBankType } from "@common";

describe("AxisSavingsParser", () => {
  const parser = new AxisSavingsParser();
  const userId = "user456";

  it("should parse valid Axis savings statement entries", async () => {
    const statement = [
      "Axis Bank Statement",
      "Generated On: 01/09/2025",
      "Tran Date,Particulars,Chq No,Dr,Cr,Bal",
      '01-08-2025,NEFT TRANSFER,,"1,234.00",,"10,000.00"',
      '02/08/25,UPI REFUND,,,"500.00","10,500.00"',
      "",
      '"Narrative after transactions"',
      '03-08-2025,SHOULD NOT PARSE,,"100.00",,"10,600.00"',
    ].join("\n");

    const txns = await parser.parse(Buffer.from(statement, "utf-8"), userId);

    expect(txns).toHaveLength(2);
    expect(txns[0]).toMatchObject({
      userId,
      bankName: EBankName.axis,
      bankType: EBankType.savings,
      debit: 1234,
      credit: 0,
      balance: 10000,
      txnDate: "2025-08-01",
      description: "NEFT TRANSFER",
    });
    expect(txns[1]).toMatchObject({
      debit: 0,
      credit: 500,
      balance: 10500,
      txnDate: "2025-08-02",
      description: "UPI REFUND",
    });
    expect(new Set(txns.map((t) => t.transactionId)).size).toBe(2);
  });

  it("should throw error when transaction header is missing", async () => {
    const content = [
      "Some preamble",
      "No transaction header here",
      "01-08-2025,NEFT TRANSFER,,100.00,,1000.00",
    ].join("\n");

    await expect(
      parser.parse(Buffer.from(content, "utf-8"), userId)
    ).rejects.toThrow(
      "Could not find Axis savings account transactions header in provided CSV."
    );
  });

  it("should skip invalid rows and ignore zero-amount entries", async () => {
    const statement = [
      "Tran Date,Particulars,Chq No,Dr,Cr,Bal",
      ",Missing Date,,100.00,,1000.00",
      "BadDate,Invalid Date,,100.00,,1100.00",
      "03-08-2025,Zero Amount,, -, -,1200.00",
      '04-08-2025,Parentheses Debit,,"(1,500.00)",,10500.00',
      '05-08-2025,Valid Credit,,,"2,500.00",13000.00',
    ].join("\n");

    const txns = await parser.parse(Buffer.from(statement, "utf-8"), userId);

    expect(txns).toHaveLength(2);
    expect(txns[0]).toMatchObject({
      debit: 1500,
      credit: 0,
      txnDate: "2025-08-04",
    });
    expect(txns[1]).toMatchObject({
      debit: 0,
      credit: 2500,
      txnDate: "2025-08-05",
    });
  });

  it("should format dd-mm-yyyy and dd/mm/yy dates", () => {
    expect(parser["formatDate"]("7-8-25")).toBe("2025-08-07");
    expect(parser["formatDate"]("07/08/1999")).toBe("1999-08-07");
  });

  it("should return undefined for invalid date strings", () => {
    expect(parser["formatDate"]("invalid")).toBeUndefined();
    expect(parser["formatDate"]("01/08")).toBeUndefined();
  });
});
