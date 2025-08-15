import { keywordCategoryMap } from "./rules";

describe("keywordCategoryMap", () => {
  it("should map known keywords to their categories", () => {
    expect(keywordCategoryMap["swiggy"]).toBe("Food & Dining");
    expect(keywordCategoryMap["zomato"]).toBe("Food & Dining");
    expect(keywordCategoryMap["bigbasket"]).toBe("Groceries");
    expect(keywordCategoryMap["amazon"]).toBe("Shopping");
    expect(keywordCategoryMap["flipkart"]).toBe("Shopping");
    expect(keywordCategoryMap["ola"]).toBe("Transport");
    expect(keywordCategoryMap["uber"]).toBe("Transport");
    expect(keywordCategoryMap["hdfc loan"]).toBe("Loan Payment");
  });

  it("should return undefined for unknown keywords", () => {
    expect(keywordCategoryMap["unknown"]).toBeUndefined();
    expect(keywordCategoryMap["pizza"]).toBeUndefined();
  });

  it("should be case sensitive", () => {
    expect(keywordCategoryMap["Swiggy"]).toBeUndefined();
    expect(keywordCategoryMap["SWIGGY"]).toBeUndefined();
  });
});
