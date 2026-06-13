import { describe, expect, it } from "vitest";
import { scheduleReview, reviewsDueOn } from "./review";

describe("review scheduling", () => {
  it("schedules a wrong topic for the next day and three days later", () => {
    const reviews = scheduleReview([], "cash-basics", 4);
    expect(reviews).toEqual([
      { topic: "cash-basics", dueDay: 5, completed: false },
      { topic: "cash-basics", dueDay: 7, completed: false }
    ]);
  });

  it("returns only unfinished reviews due by the current day", () => {
    expect(
      reviewsDueOn(
        [
          { topic: "cash-basics", dueDay: 3, completed: true },
          { topic: "sales", dueDay: 4, completed: false },
          { topic: "assets", dueDay: 6, completed: false }
        ],
        5
      )
    ).toEqual([{ topic: "sales", dueDay: 4, completed: false }]);
  });
});

