import type { LearnerProgress } from "../domain/types";
import { migrateProgress } from "./progressMigration";

type BackupEnvelope = {
  kind: "campus-ledger-backup";
  schemaVersion: 1 | 2;
  exportedAt: string;
  progress: unknown;
};

export const exportProgress = (progress: LearnerProgress) =>
  JSON.stringify(
    {
      kind: "campus-ledger-backup",
      schemaVersion: 2,
      exportedAt: new Date().toISOString(),
      progress
    } satisfies BackupEnvelope,
    null,
    2
  );

export const importProgress = (raw: string): LearnerProgress => {
  let parsed: Partial<BackupEnvelope>;
  try {
    parsed = JSON.parse(raw) as Partial<BackupEnvelope>;
  } catch {
    throw new Error("バックアップファイルを読み取れません");
  }

  if (
    parsed.kind !== "campus-ledger-backup" ||
    (parsed.schemaVersion !== 1 && parsed.schemaVersion !== 2) ||
    !parsed.progress
  ) {
    throw new Error("対応していないバックアップ形式です");
  }

  try {
    return migrateProgress(parsed.progress);
  } catch {
    throw new Error("対応していないバックアップ形式です");
  }
};
