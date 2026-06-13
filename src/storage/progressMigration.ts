import type { LearnerProgress } from "../domain/types";

type ProgressCandidate = Partial<Omit<LearnerProgress, "schemaVersion">> & {
  schemaVersion?: 1 | 2;
};

export const migrateProgress = (value: unknown): LearnerProgress => {
  if (!value || typeof value !== "object") {
    throw new Error("学習記録を読み取れません");
  }

  const progress = value as ProgressCandidate;
  if (
    (progress.schemaVersion !== 1 && progress.schemaVersion !== 2) ||
    typeof progress.currentDay !== "number" ||
    !Array.isArray(progress.completedDays) ||
    !progress.answers ||
    !Array.isArray(progress.reviews) ||
    !Array.isArray(progress.mockAttempts)
  ) {
    throw new Error("対応していない学習記録です");
  }

  return {
    schemaVersion: 2,
    currentDay: progress.currentDay,
    completedDays: progress.completedDays,
    answers: progress.answers,
    reviews: progress.reviews,
    mockAttempts: progress.mockAttempts,
    currentStreak:
      typeof progress.currentStreak === "number" ? progress.currentStreak : 0,
    bestStreak:
      typeof progress.bestStreak === "number" ? progress.bestStreak : 0
  };
};
