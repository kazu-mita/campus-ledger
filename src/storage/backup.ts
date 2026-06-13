import type { LearnerProgress } from "../domain/types";

type BackupEnvelope = {
  kind: "campus-ledger-backup";
  schemaVersion: 1;
  exportedAt: string;
  progress: LearnerProgress;
};

export const exportProgress = (progress: LearnerProgress) =>
  JSON.stringify(
    {
      kind: "campus-ledger-backup",
      schemaVersion: 1,
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
    parsed.schemaVersion !== 1 ||
    !parsed.progress ||
    parsed.progress.schemaVersion !== 1
  ) {
    throw new Error("対応していないバックアップ形式です");
  }

  return parsed.progress;
};

