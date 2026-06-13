import { describe, expect, it } from "vitest";
import { exportProgress, importProgress } from "./backup";
import type { LearnerProgress } from "../domain/types";

describe("progress backup", () => {
  it("round-trips a versioned progress backup", () => {
    const progress: LearnerProgress = {
      schemaVersion: 1,
      currentDay: 3,
      completedDays: [1, 2],
      answers: {},
      reviews: [],
      mockAttempts: []
    };

    expect(importProgress(exportProgress(progress))).toEqual(progress);
  });

  it("rejects unsupported backup versions", () => {
    expect(() =>
      importProgress(
        JSON.stringify({ kind: "campus-ledger-backup", schemaVersion: 999 })
      )
    ).toThrow("対応していないバックアップ形式です");
  });
});
