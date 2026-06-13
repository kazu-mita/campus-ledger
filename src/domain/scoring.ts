import type { JournalEntry, JournalLine } from "./types";

export type GradeResult = {
  correct: boolean;
  accountCorrect: boolean;
  amountCorrect: boolean;
  balanced: boolean;
};

const sortLines = (lines: JournalLine[]) =>
  [...lines].sort(
    (a, b) =>
      a.account.localeCompare(b.account, "ja") || a.amount - b.amount
  );

const sameAccounts = (actual: JournalLine[], expected: JournalLine[]) => {
  const actualAccounts = actual.map(({ account }) => account).sort();
  const expectedAccounts = expected.map(({ account }) => account).sort();
  return JSON.stringify(actualAccounts) === JSON.stringify(expectedAccounts);
};

const sameAmounts = (actual: JournalLine[], expected: JournalLine[]) => {
  const actualAmounts = actual.map(({ amount }) => amount).sort((a, b) => a - b);
  const expectedAmounts = expected
    .map(({ amount }) => amount)
    .sort((a, b) => a - b);
  return JSON.stringify(actualAmounts) === JSON.stringify(expectedAmounts);
};

const linesEqual = (actual: JournalLine[], expected: JournalLine[]) =>
  JSON.stringify(sortLines(actual)) === JSON.stringify(sortLines(expected));

const total = (lines: JournalLine[]) =>
  lines.reduce((sum, line) => sum + line.amount, 0);

export const gradeJournalEntry = (
  actual: JournalEntry,
  expected: JournalEntry
): GradeResult => {
  const accountCorrect =
    sameAccounts(actual.debit, expected.debit) &&
    sameAccounts(actual.credit, expected.credit);
  const amountCorrect =
    sameAmounts(actual.debit, expected.debit) &&
    sameAmounts(actual.credit, expected.credit);
  const balanced = total(actual.debit) === total(actual.credit);
  const correct =
    linesEqual(actual.debit, expected.debit) &&
    linesEqual(actual.credit, expected.credit);

  return { correct, accountCorrect, amountCorrect, balanced };
};

