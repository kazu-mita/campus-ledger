import { describe, expect, it } from "vitest";
import { getStaffRank, updateStreak } from "./gamification";

describe("getStaffRank", () => {
  it.each([
    [0, "研修職員"],
    [2, "研修職員"],
    [3, "経費担当"],
    [5, "経費担当"],
    [6, "主任補佐"],
    [9, "主任補佐"],
    [10, "経理主任"],
    [14, "経理主任"]
  ])("%i completed days returns %s", (completedDays, name) => {
    expect(getStaffRank(completedDays).name).toBe(name);
  });
});

describe("updateStreak", () => {
  it("increments after a new correct answer", () => {
    expect(updateStreak(2, 4, false, true)).toEqual({
      currentStreak: 3,
      bestStreak: 4
    });
  });

  it("resets to zero after an incorrect answer", () => {
    expect(updateStreak(5, 7, false, false)).toEqual({
      currentStreak: 0,
      bestStreak: 7
    });
  });

  it("does not count an already-correct answer twice", () => {
    expect(updateStreak(3, 3, true, true)).toEqual({
      currentStreak: 3,
      bestStreak: 3
    });
  });
});
