import { openDB } from "idb";
import type { LearnerProgress } from "../domain/types";
import { migrateProgress } from "./progressMigration";

const DB_NAME = "campus-ledger";
const STORE_NAME = "progress";
const PROGRESS_KEY = "learner";

const dbPromise = openDB(DB_NAME, 1, {
  upgrade(database) {
    if (!database.objectStoreNames.contains(STORE_NAME)) {
      database.createObjectStore(STORE_NAME);
    }
  }
});

export const createInitialProgress = (): LearnerProgress => ({
  schemaVersion: 2,
  currentDay: 1,
  completedDays: [],
  answers: {},
  reviews: [],
  mockAttempts: [],
  currentStreak: 0,
  bestStreak: 0
});

export const loadProgress = async (): Promise<LearnerProgress> => {
  const database = await dbPromise;
  const stored = await database.get(STORE_NAME, PROGRESS_KEY);
  if (!stored) return createInitialProgress();

  const migrated = migrateProgress(stored);
  if ((stored as { schemaVersion?: number }).schemaVersion !== 2) {
    await database.put(STORE_NAME, migrated, PROGRESS_KEY);
  }
  return migrated;
};

export const saveProgress = async (progress: LearnerProgress) => {
  const database = await dbPromise;
  await database.put(STORE_NAME, progress, PROGRESS_KEY);
};

export const clearProgress = async () => {
  const database = await dbPromise;
  await database.delete(STORE_NAME, PROGRESS_KEY);
};
