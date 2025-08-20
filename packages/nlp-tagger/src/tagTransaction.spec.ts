import { tagTransaction } from "./start";

// Integration test for the tagTransaction helper
// which applies rule-based categorization first and
// falls back to a default category when no rule matches.
describe("tagTransaction", () => {
  it("categorizes known keywords using the rule engine", () => {
    expect(tagTransaction("Swiggy Order #1234")).toEqual({
      category: "Food & Dining",
      source: "rule-engine",
    });
  });

  it("returns Uncategorized when no keyword matches", () => {
    expect(tagTransaction("Random merchant")).toEqual({
      category: "Uncategorized",
      source: "default",
    });
  });
});
