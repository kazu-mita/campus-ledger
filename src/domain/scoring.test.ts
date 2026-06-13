import { describe, expect, it } from "vitest";
import { gradeJournalEntry } from "./scoring";

describe("gradeJournalEntry", () => {
  it("accepts equivalent compound journal lines in a different order", () => {
    const answer = {
      debit: [
        { account: "旅費交通費", amount: 46000 },
        { account: "現金", amount: 4000 }
      ],
      credit: [{ account: "仮払金", amount: 50000 }]
    };

    const result = gradeJournalEntry(
      {
        debit: [
          { account: "現金", amount: 4000 },
          { account: "旅費交通費", amount: 46000 }
        ],
        credit: [{ account: "仮払金", amount: 50000 }]
      },
      answer
    );

    expect(result).toEqual({
      correct: true,
      accountCorrect: true,
      amountCorrect: true,
      balanced: true
    });
  });

  it("reports account and amount errors separately", () => {
    const result = gradeJournalEntry(
      {
        debit: [{ account: "消耗品費", amount: 48000 }],
        credit: [{ account: "現金", amount: 48000 }]
      },
      {
        debit: [{ account: "備品", amount: 50000 }],
        credit: [{ account: "現金", amount: 50000 }]
      }
    );

    expect(result.accountCorrect).toBe(false);
    expect(result.amountCorrect).toBe(false);
    expect(result.balanced).toBe(true);
    expect(result.correct).toBe(false);
  });
});

