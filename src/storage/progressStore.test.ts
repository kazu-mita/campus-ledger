import { beforeEach, describe, expect, it } from "vitest";
import {
  clearProgress,
  createInitialProgress,
  loadProgress,
  saveProgress
} from "./progressStore";

describe("progress store", () => {
  beforeEach(async () => {
    await clearProgress();
  });

  it("creates initial progress when the database is empty", async () => {
    expect(await loadProgress()).toEqual(createInitialProgress());
  });

  it("persists progress between reads", async () => {
    const progress = createInitialProgress();
    progress.currentDay = 6;
    progress.completedDays = [1, 2, 3, 4, 5];

    await saveProgress(progress);

    expect(await loadProgress()).toEqual(progress);
  });
});

