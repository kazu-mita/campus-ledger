import { describe, expect, it } from "vitest";
import { contentManifest, lessons } from "./lessons";

describe("fixed bookkeeping curriculum", () => {
  it("contains all fourteen days and two mock exams", () => {
    expect(lessons).toHaveLength(14);
    expect(lessons.map((lesson) => lesson.day)).toEqual([
      1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14
    ]);
    expect(lessons.filter((lesson) => lesson.isMockExam)).toHaveLength(2);
    expect(contentManifest.totalDays).toBe(14);
    expect(contentManifest.totalMockExams).toBe(2);
  });

  it("assigns each mock exam exactly one hundred points", () => {
    for (const exam of lessons.filter((lesson) => lesson.isMockExam)) {
      expect(
        exam.questions.reduce((total, question) => total + question.points, 0)
      ).toBe(100);
    }
  });

  it("contains balanced model journal entries and complete explanations", () => {
    for (const lesson of lessons) {
      expect(lesson.topics.length).toBeGreaterThan(0);
      expect(lesson.questions.length).toBeGreaterThan(0);

      for (const question of lesson.questions) {
        const debit = question.answer.debit.reduce(
          (sum, line) => sum + line.amount,
          0
        );
        const credit = question.answer.credit.reduce(
          (sum, line) => sum + line.amount,
          0
        );

        expect(debit, question.id).toBe(credit);
        expect(question.hint.length, question.id).toBeGreaterThan(8);
        expect(question.explanation.length, question.id).toBeGreaterThan(12);
      }
    }
  });
});

