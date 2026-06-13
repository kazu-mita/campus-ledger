import { openDB } from "idb";
import type { LearnerProgress } from "../domain/types";

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
  schemaVersion: 1,
  currentDay: 1,
  completedDays: [],
  answers: {},
  reviews: [],
  mockAttempts: []
});

export const loadProgress = async (): Promise<LearnerProgress> => {
  const database = await dbPromise;
  return (
    ((await database.get(STORE_NAME, PROGRESS_KEY)) as
      | LearnerProgress
      | undefined) ?? createInitialProgress()
  );
};

export const saveProgress = async (progress: LearnerProgress) => {
  const database = await dbPromise;
  await database.put(STORE_NAME, progress, PROGRESS_KEY);
};

export const clearProgress = async () => {
  const database = await dbPromise;
  await database.delete(STORE_NAME, PROGRESS_KEY);
};

