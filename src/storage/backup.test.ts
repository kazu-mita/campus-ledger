import { describe, expect, it } from "vitest";
import { exportProgress, importProgress } from "./backup";
import type { LearnerProgress } from "../domain/types";

describe("progress backup", () => {
  it("round-trips a versioned progress backup", () => {
    const progress: LearnerProgress = {
      schemaVersion: 2,
      currentDay: 3,
      completedDays: [1, 2],
      answers: {},
      reviews: [],
      mockAttempts: [],
      currentStreak: 2,
      bestStreak: 4
    };

    expect(importProgress(exportProgress(progress))).toEqual(progress);
  });

  it("imports a legacy v1 backup as v2 progress", () => {
    const restored = importProgress(
      JSON.stringify({
        kind: "campus-ledger-backup",
        schemaVersion: 1,
        exportedAt: "2026-06-13T00:00:00.000Z",
        progress: {
          schemaVersion: 1,
          currentDay: 3,
          completedDays: [1, 2],
          answers: {},
          reviews: [],
          mockAttempts: []
        }
      })
    );

    expect(restored).toMatchObject({
      schemaVersion: 2,
      currentDay: 3,
      currentStreak: 0,
      bestStreak: 0
    });
  });

  it("rejects unsupported backup versions", () => {
    expect(() =>
      importProgress(
        JSON.stringify({ kind: "campus-ledger-backup", schemaVersion: 999 })
      )
    ).toThrow("対応していないバックアップ形式です");
  });
});
