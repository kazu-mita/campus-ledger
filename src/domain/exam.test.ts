import { describe, expect, it } from "vitest";
import { getRemainingSeconds, startExam } from "./exam";

describe("mock exam timer", () => {
  it("restores remaining time from the persisted end timestamp", () => {
    const attempt = startExam("mock-1", new Date("2026-06-12T00:00:00Z"), 60);
    expect(
      getRemainingSeconds(attempt, new Date("2026-06-12T00:15:20Z"))
    ).toBe(2680);
  });

  it("never returns a negative duration", () => {
    const attempt = startExam("mock-1", new Date("2026-06-12T00:00:00Z"), 60);
    expect(
      getRemainingSeconds(attempt, new Date("2026-06-12T01:10:00Z"))
    ).toBe(0);
  });
});

