import { categorizeByRules, keywordCategoryMap } from "./module";

describe("categorizeByRules", () => {
  it("should map swiggy to Food & Dining", () => {
    expect(categorizeByRules("Swiggy Order #1234", keywordCategoryMap)).toBe(
      "Food & Dining",
    );
  });

  it("should return null for unknown keywords", () => {
    expect(categorizeByRules("Random merchant", keywordCategoryMap)).toBeNull();
  });

  it("should map bigbasket to Groceries", () => {
    expect(
      categorizeByRules("BigBasket Grocery Delivery", keywordCategoryMap),
    ).toBe("Groceries");
  });

  it("should map amazon to Shopping", () => {
    expect(categorizeByRules("Amazon Purchase", keywordCategoryMap)).toBe(
      "Shopping",
    );
  });

  it("should map ola to Transport", () => {
    expect(categorizeByRules("Ola Ride", keywordCategoryMap)).toBe("Transport");
  });

  it("should map hdfc loan to Loan Payment", () => {
    expect(categorizeByRules("HDFC Loan EMI", keywordCategoryMap)).toBe(
      "Loan Payment",
    );
  });
});
