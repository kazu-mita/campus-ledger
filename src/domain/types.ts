export type JournalLine = {
  account: string;
  amount: number;
};

export type JournalEntry = {
  debit: JournalLine[];
  credit: JournalLine[];
};

export type QuestionType =
  | "journal"
  | "multiple-choice"
  | "ledger"
  | "statement";

export type Question = {
  id: string;
  type: QuestionType;
  topic: string;
  prompt: string;
  documentTitle: string;
  documentMeta: string;
  points: number;
  hint: string;
  explanation: string;
  answer: JournalEntry;
};

export type StoryBeat = {
  speaker: string;
  role: string;
  text: string;
};

export type LessonDay = {
  day: number;
  title: string;
  subtitle: string;
  department: string;
  topics: string[];
  briefing: StoryBeat;
  takeaway: string;
  questions: Question[];
  isMockExam?: boolean;
};

export type ReviewSchedule = {
  topic: string;
  dueDay: number;
  completed: boolean;
};

export type StoredAnswer = {
  entry: JournalEntry;
  correct: boolean;
  attempts: number;
};

export type MockExamAttempt = {
  id: string;
  examId: string;
  startedAt: string;
  endsAt: string;
  submittedAt?: string;
  score?: number;
};

export type LearnerProgress = {
  schemaVersion: 2;
  currentDay: number;
  completedDays: number[];
  answers: Record<string, StoredAnswer>;
  reviews: ReviewSchedule[];
  mockAttempts: MockExamAttempt[];
  currentStreak: number;
  bestStreak: number;
};

export type ContentManifest = {
  schemaVersion: 1;
  contentVersion: string;
  totalDays: number;
  totalMockExams: number;
};
