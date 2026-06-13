import { describe, expect, it } from "vitest";
import { migrateProgress } from "./progressMigration";

describe("migrateProgress", () => {
  it("migrates v1 progress without losing learning records", () => {
    const legacy = {
      schemaVersion: 1,
      currentDay: 4,
      completedDays: [1, 2, 3],
      answers: {
        "day-1-q1": {
          entry: {
            debit: [{ account: "現金", amount: 20000 }],
            credit: [{ account: "売上", amount: 20000 }]
          },
          correct: true,
          attempts: 1
        }
      },
      reviews: [{ topic: "資産", dueDay: 4, completed: false }],
      mockAttempts: [
        {
          id: "mock-1",
          examId: "day-13",
          startedAt: "2026-06-13T00:00:00.000Z",
          endsAt: "2026-06-13T01:00:00.000Z"
        }
      ]
    };

    expect(migrateProgress(legacy)).toEqual({
      ...legacy,
      schemaVersion: 2,
      currentStreak: 0,
      bestStreak: 0
    });
  });

  it("preserves streak values in v2 progress", () => {
    const current = {
      schemaVersion: 2,
      currentDay: 2,
      completedDays: [1],
      answers: {},
      reviews: [],
      mockAttempts: [],
      currentStreak: 3,
      bestStreak: 5
    };

    expect(migrateProgress(current)).toEqual(current);
  });

  it("rejects malformed progress", () => {
    expect(() => migrateProgress({ schemaVersion: 2 })).toThrow(
      "対応していない学習記録です"
    );
  });
});
