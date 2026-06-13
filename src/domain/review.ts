import type { ReviewSchedule } from "./types";

export const scheduleReview = (
  existing: ReviewSchedule[],
  topic: string,
  currentDay: number
): ReviewSchedule[] => {
  const candidates = [currentDay + 1, currentDay + 3]
    .filter((dueDay) => dueDay <= 14)
    .map((dueDay) => ({ topic, dueDay, completed: false }));

  return [
    ...existing,
    ...candidates.filter(
      (candidate) =>
        !existing.some(
          (item) =>
            item.topic === candidate.topic && item.dueDay === candidate.dueDay
        )
    )
  ].sort((a, b) => a.dueDay - b.dueDay);
};

export const reviewsDueOn = (
  reviews: ReviewSchedule[],
  currentDay: number
) =>
  reviews.filter(
    (review) => !review.completed && review.dueDay <= currentDay
  );

