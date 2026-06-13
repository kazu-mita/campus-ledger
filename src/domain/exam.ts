import type { MockExamAttempt } from "./types";

export const startExam = (
  examId: string,
  now: Date,
  durationMinutes: number
): MockExamAttempt => ({
  id: `${examId}-${now.getTime()}`,
  examId,
  startedAt: now.toISOString(),
  endsAt: new Date(now.getTime() + durationMinutes * 60_000).toISOString()
});

export const getRemainingSeconds = (
  attempt: MockExamAttempt,
  now: Date
) => Math.max(0, Math.ceil((Date.parse(attempt.endsAt) - now.getTime()) / 1000));

